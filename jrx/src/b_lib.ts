/**
 * JR Controller "Library".
 *
 * Conceptually this is the thread corresponding to the application controller.
 * The background script calls `b_main()` and does nothing else. The popup
 * script calls the various `p_...` functions, which black-box away the IPC
 * nonsense.  Really, conceptually, the popup script is making a call to the
 * background script, and the code idiom merely reflects that conceptual
 * reality.
 *
 * In a perfect world, the content script would also act like this. However,
 *
 * 1. The content script is already a finished product. All it needs to do is
 *    relay messages back and forth between this thread and the page script,
 *    and it does that just fine.
 * 2. The content script isn't an ES6 module, and so "imports" are a giant pain
 *    in the ass. So rewriting it to fit this "call the background script"
 *    idiom is just not worth it.  It already works.  The meaningful IPC is
 *    between the page script and a generic wallet, and that is already defined
 *    in AWCP.
 *
 * # Naming/Notation Conventions
 *
 * ```
 * - b_...   -> background script API
 * - bi_...  -> background internal
 * - bis_... -> background internal storage
 * - p_...   -> popup script API
 * - !...    -> bookmark for regex searches to quickly find a section
 *              bang = bookmark
 * ```
 *
 *
 * Re storage: the browser's storage layer for extensions basically stores
 * the data in JSON, so we need a separate type layer to make sure the
 * conversion between the program's internal state and what the browser
 * stores doesn't get fornicated up.  Despite the fact that JSON is magical
 * fairy dust that seamlessly encodes/decodes losslessly to and from any type,
 * I still am much more comfortable writing it out myself.
 *
 *
 * FIXME: check bytes or sth for keypair storage to guard against json fornicateery
 * FIXME: versioned storage
 * FIXME: move some of the AWCP data making functions to the AWCP lib
 * FIXME: the address_subscribe data scraping nonsense needs to be factored out
 * FIXME: quiet mode (undetectable by default)
 * FIXME: ask user if he wants to connect/address/etc
 * FIXME: ask user if he wants to sign messages
 *
 * @module
 */


import * as awcp        from './jex_include/local-awcp-0.2.2/dist/awcp.js';
// @ts-ignore yes i know blake is stupid
import * as blake2b     from './jex_include/local-blakejs-1.2.1/dist/blake2b.js';
//import * as vdk_aecrypt from './jex_include/local-vdk_aecrypt-0.1.0/dist/vdk_aecrypt.js';
import * as vdk_aeser   from './jex_include/local-vdk_aeser-0.1.0/dist/vdk_aeser.js';
import * as vdk_binary  from './jex_include/local-vdk_binary-0.1.0/dist/vdk_binary.js';


export type {
    // global types
    // popup script call/return data
};


export {
    // popup script api
    // background script api
    b_main
};



//=============================================================================
//=============================================================================
// API: GLOBAL TYPES
//=============================================================================
//=============================================================================


//=============================================================================
//=============================================================================
// API: POPUP TYPES
//=============================================================================
//=============================================================================


//=============================================================================
//=============================================================================
// API: POPUP SCRIPT
//=============================================================================
//=============================================================================


//=============================================================================
//=============================================================================
// API: BACKGROUND SCRIPT
//=============================================================================
//=============================================================================

/**
 * main function for background thread
 */
async function
b_main
    ()
    : Promise<void>
{
    console.log('b_main');

    // handle messages from content or popup scripts
    browser.runtime.onMessage.addListener(bi_runtime_msg_handler);
}



//=============================================================================
//=============================================================================
// INTERNALS: TYPES
//=============================================================================
//=============================================================================
// !bi_types !bi_state !bi-types !bi-state

/**
 * @example
 * ```ts
 * // EventData_A2w
 * {type : "to_waellet",
 *         // RpcCall
 *  data : {jsonrpc : "2.0",
 *          id      : "ske-connect-1",
 *          method  : "connection.open",
 *                    // Params_A2W_connection_open
 *          params  : {name    : "sidekick examples",
 *                     version : 1}}}
 * ```
 *
 * @internal
 */
type bi_a2w_calldata
    = awcp.EventData_A2W<awcp.RpcCall<string, any>>;
                                   // method  params



/**
 * Return data for queries from a page script
 *
 * @internal
 */
type bi_w2a_return_data
    = awcp.EventData_W2A<awcp.RpcResp<string, any>>;



/**
 * Type copied from NaCL
 *
 * @internal
 */
type bi_nacl_keypair
    = {secretKey : Uint8Array,
       publicKey : Uint8Array};



/**
 * JR state used internally
 *
 * @internal
 */
type bi_state
    = {keypairs: Array<bi_nacl_keypair>};



/**
 * JR storage state
 *
 * Storage is in JSON so we have to have a different type for storage and for
 * what's actually used during ordinary data processing.
 *
 * @internal
 */
type bis_state
    = {jr_state: {keypairs: Array<bis_nacl_keypair>}};



/**
 * How keypairs are stored
 *
 * @internal
 */
type bis_nacl_keypair
    = {secretKey : Array<number>,
       publicKey : Array<number>};



//=============================================================================
//=============================================================================
// INTERNALS: FUNCTIONS
//=============================================================================
//=============================================================================


/**
 * Handle messages from either content or popup script
 *
 * Note to self: `sendResponse` is fake. Doesn't work. Instead just return the
 * response
 *
 * @internal
 */
async function
bi_runtime_msg_handler
    (msg          : {frum: 'content' | 'popup',
                     data: any},
     sender       : any,
     sendResponse : any)
    : Promise<bi_w2a_return_data | bi_popup_return_data>
{
    //console.log('msg', msg);
    //console.log('sender', sender);
    //console.log('sendResponse', sendResponse);

    switch (msg.frum) {
        // messages from the content script (i.e. from page scripts)
        case 'content':
            return await bi_msg_handler_content(msg.data as bi_a2w_calldata, sender, sendResponse);
        // messages from the popup window
        case 'popup':
            return await bi_msg_handler_popup(msg.data as bi_popup_calldata, sender, sendResponse);
    }
}



//-----------------------------------------------------------------------------
// INTERNALS: CONTENT SCRIPT MESSAGE HANDLING
//-----------------------------------------------------------------------------

/**
 * Handle messages from the content script
 *
 * Note to self: `sendResponse` is fake. Doesn't work. Instead just return the
 * response.
 *
 * Literally the way it works is that
 *
 * - IF this is a non-async function (i.e. does NOT return a `Promise`), THEN
 *   `sendResponse` is fake and the runtime sends back the return value of the
 *   function. This is our case.
 * - ELSE `sendResponse` works. Presumably this is for backward compabitility.
 *
 * @internal
 */
async function
bi_msg_handler_content
    (msg          : bi_a2w_calldata,
     sender       : any,
     sendResponse : any)
    : Promise<bi_w2a_return_data>
{
    console.log('bi_msg_handler_content', {msg: msg});
    //console.log('msg', msg);
    //console.log('sender', sender);
    //console.log('sendResponse', sendResponse);

    let msg_method : string          = msg.data.method;
    let msg_id     : string | number = msg.data.id;

    // get the state
    let i_state : bi_state = await bi_get_state();


    // function to encode the ok message
    // depends on parameters above so makes sense to have it be a lambda
    function w2a_ok(result_for_content_script: any) {
        return bi_mk_w2a_msg_ok(msg_method,
                                msg_id,
                                result_for_content_script);
    }

    // function to encode the error message
    // depends on parameters above so makes sense to have it be a lambda
    function w2a_err(code: number, message: string) {
        return bi_mk_w2a_msg_err(msg_method,
                                 msg_id,
                                 code,
                                 message);
    }


    console.log('jr bg content message handler method:', msg.data.method);

    let public_key        : Uint8Array = i_state.keypairs[0].publicKey;
    let secret_key        : Uint8Array = i_state.keypairs[0].secretKey;

    switch (msg.data.method) {
        // right now just give connect info back
        case "connection.open":
            return w2a_ok({id        : "jr",
                           name      : "JR",
                           networkId : "ae_uat",
                           origin    : browser.runtime.getURL('/'),
                           type      : "extension"});

        // right now just give address back
        case "address.subscribe":
            console.log('jr bg content message handler address.subscribe');
            // convert it to a string
            let address_ak_str : string    = await vdk_aeser.pubkey2ak_str(public_key);
            console.log('public key:', address_ak_str);
            return w2a_ok(bi_address_reply(address_ak_str, []));

        // right now just sign message
        case "message.sign":
            console.log('jr bg content message handler message sign');
            let msg_str : string = msg.data.params.message;
            return w2a_ok(msg_sign(msg_str, secret_key));

        // right now just sign tx
        case "transaction.sign":
            console.log('jr bg content message handler transaction sign');
            let tx_str : string = msg.data.params.tx;
            console.log('transaction: ', tx_str);
            let result          = await tx_sign(tx_str, secret_key)
            console.log('signed transaction: ', result.signedTransaction);
            return w2a_ok(result);

        // default is NYI
        default:
            return w2a_err(awcp.ERROR_CODE_RpcMethodNotFoundError, 'not yet implemented');
    }
}


/**
 * Fornicating js block scope rules
 *
 * NOOOOOOOO YOU CAN'T DECLARE TWO DIFFERENT VARIABLES WITH THE SAME NAME IN
 * TWO DIFFERENT CASES EVEN THOUGH THEY'RE MUTUALLY EXCLUSIVE
 *
 * wojak.jpg
 *
 * @internal
 */
function
msg_sign
    (msg_str    : string,
     secret_key : Uint8Array)
    : {signature : string}
{
    // use nacl detached signatures
    // https://github.com/aeternity/aepp-sdk-js/blob/5df22dd297abebc0607710793a7234e6761570d4/src/utils/crypto.ts#L141-L143
    // https://github.com/aeternity/aepp-sdk-js/blob/5df22dd297abebc0607710793a7234e6761570d4/src/utils/crypto.ts#L160-L167
    let hashed_salted_msg : Uint8Array = hash_and_salt_msg(msg_str);
    // @ts-ignore yes nacl is stupid
    let signature         : Uint8Array = nacl.sign.detached(hashed_salted_msg, secret_key);
    let signature_str     : string     = vdk_binary.bytes_to_hex_str(signature);
    return {signature: signature_str};
}



/**
 * Fornicating js block scope rules
 *
 * NOOOOOOOO YOU CAN'T DECLARE TWO DIFFERENT VARIABLES WITH THE SAME NAME IN
 * TWO DIFFERENT CASES EVEN THOUGH THEY'RE MUTUALLY EXCLUSIVE
 *
 * wojak.jpg
 *
 * @internal
 */
async function
tx_sign
    (tx_str    : string,
     secret_key : Uint8Array)
    : Promise<{signedTransaction : string}>
{
    // debug: show tx
    let mansplained_tx  : object     = await vdk_aeser.mansplain(tx_str);
    console.log('mansplained_tx,', mansplained_tx);


    let tx_bytes        : Uint8Array = (await vdk_aeser.unbaseNcheck(tx_str)).bytes;
    // thank you ulf
    // https://github.com/aeternity/protocol/tree/fd179822fc70241e79cbef7636625cf344a08109/consensus#transaction-signature
    // we sign <<NetworkId, SerializedObject>>
    // SerializedObject can either be the object or the hash of the object
    // let's stick with hash for now
    let network_id      : Uint8Array = vdk_binary.encode_utf8('ae_uat');
    // let tx_hash_bytes   : Uint8Array = hash(tx_bytes);
    let sign_data       : Uint8Array = vdk_binary.bytes_concat(network_id, tx_bytes);
    // @ts-ignore yes nacl is stupid
    let signature       : Uint8Array = nacl.sign.detached(sign_data, secret_key);
    let signed_tx_bytes : Uint8Array = vdk_aeser.signed_tx([signature], tx_bytes);
    let signed_tx_str   : string     = await vdk_aeser.baseNcheck('tx', signed_tx_bytes);

    // debugging
    let mansplained_stx : object     = await vdk_aeser.mansplain(signed_tx_str);
    console.log('mansplained signed tx:', mansplained_stx);

    return {signedTransaction: signed_tx_str};
}

/**
 * Make the dumb address_subscribe thing
 *
 * @internal
 */
function
bi_address_reply
    (current_pubkey_str : string,
     other_pubkey_strs  : Array<string>)
    : awcp.Result_W2A_address_subscribe
{
    // From the AWCP docs:
    //
    //      @example
    //      This is if the user has many keypairs. The currently selected one is under
    //      `current`.  Craig, I agree this is stupid, but that's how it works.
    //
    //      {
    //          "subscription": [
    //              "connected"
    //          ],
    //          "address": {
    //              "current": {
    //                  "ak_25C3xaAGQddyKAnaLLMjAhX24xMktH2NNZxY3fMaZQLMGED2Nf": {}
    //              },
    //              "connected": {
    //                  "ak_BMtPGuqDhWLnMVL4t6VFfS32y2hd8TSYwiYa2Z3VdmGzgNtJP": {},
    //                  "ak_25BqQuiVCasiqTkXHEffq7XCsuYEtgjNeZFeVFbuRtJkfC9NyX": {},
    //                  "ak_4p6gGoCcwQzLXd88KhdjRWYgd4MfTsaCeD8f99pzZhJ6vzYYV": {}
    //              }
    //          }
    //      }

    // so we make the "object" in the "current" field
    // this is so dumb but
    let current_obj = {};
    // @ts-ignore shut up tsc i know this is stupid it's not my fault
    current_obj[current_pubkey_str] = {};

    // make the object in the "connected" field
    let connected_obj = {};
    for (let this_pubkey_str of other_pubkey_strs) {
        // @ts-ignore shut up tsc i know this is stupid it's not my fault
        connected_obj[this_pubkey_str] = {};
    }

    return {subscription : ['connected'],
            address      : {current   : current_obj,
                            connected : connected_obj}};
}



/**
 * SUCCESS CASE: Wrap up bs for w2a message
 *
 * This really should go into the AWCP library but I'm lazy
 *
 * @internal
 */
function
bi_mk_w2a_msg_ok
    <result_t extends any>
    (method : string,
     id     : string | number,
     result : result_t)
    : awcp.EventData_W2A<awcp.RpcResp_ok<string, result_t>>
{
    return {type : "to_aepp",
            data : {jsonrpc : "2.0",
                    method  : method,
                    id      : id,
                    result  : result}};
}



/**
 * ERROR CASE: Wrap up bs for w2a message
 *
 * This really should go into the AWCP library but I'm lazy
 *
 * @internal
 */
function
bi_mk_w2a_msg_err
    (method  : string,
     id      : string | number,
     code    : number,
     message : string)
    : awcp.EventData_W2A<awcp.RpcResp_error<string>>
{
    return {type : "to_aepp",
            data : {jsonrpc : "2.0",
                    method  : method,
                    id      : id,
                    error   : {code    : code,
                               message : message}}};
}



//----------------------------------------------------------------------------
// INTERNALS: POPUP WINDOW MESSAGE HANDLING
//----------------------------------------------------------------------------


type bi_popup_calldata
    = 'init';


type bi_popup_return_data
    = 'die';


/**
 * Handle messages from the popup
 *
 * @internal
 */
async function
bi_msg_handler_popup
    (msg          : bi_popup_calldata,
     sender       : any,
     sendResponse : any)
    : Promise<bi_popup_return_data>
{
    console.log('jr bg_msg_handler_popup msg', msg);
    return 'die';
}



//=============================================================================
//=============================================================================
// INTERNALS: STORAGE API
//=============================================================================
//=============================================================================


/**
 * Fetch the state from local storage
 *
 * If there is no state make an initial state and store it
 *
 * @internal
 */
async function
bi_get_state
    ()
    : Promise<bi_state>
{
    console.log('jr bg bi_get_state');

    // so
    // - if extension has NEVER committed state (i.e. this is the first
    //   invocation), there will be NO key "jr_state"
    // - if we have committed state, that key will exist
    //
    // right now our game is branching on whether or not there is existing
    // state in the browser's storage
    //
    // - if there is state, we simply fetch it from storage, convert it to a
    //   type suitable for use in code (e.g. keypairs are byte arrays rather
    //   than dumb JSON number arrays)
    // - if there is no state, we create a default initial state, commit it,
    //   and hand it back to the calling code

    // this may or may not have the keyword "jr_state"
    let gotten_state : ({} | bis_state) = await browser.storage.local.get();

    console.log('jr bg gotten_state', gotten_state);

    // problem: browser storage is JSON basically
    // so we need to convert our state to and from json


    // if there is such a state, get it
    // @ts-ignore ts doesn't understand querying if a key exists
    if (!!(gotten_state.jr_state)) {
        console.log('foo');
        // TS doesn't know we've proven the key exists and so therefore this is
        // of type bis_state
        return bi_s2i(gotten_state as bis_state);
    }
    // otherwise return default state
    else {
        console.log('bar');
        // set the state
        let default_i_state : bi_state  = bi_state_default();
        await bi_set_state(default_i_state);
        // return it
        return default_i_state;
    }
}



/**
 * Set the state. Blocks until state is set, exception is thrown if there is an
 * exception.
 *
 * @internal
 */
async function
bi_set_state
    (i_state : bi_state)
    : Promise<void>
{
    console.log('jr bg bi_set_state internal state:', i_state);

    // convert to storage state
    let s_state : bis_state = bi_i2s(i_state);

    console.log('jr bg bi_set_state storage state:', s_state);

    // store
    await browser.storage.local.set(s_state);
}



//-----------------------------------------------------------------------------
// INTERNALS: INTERNAL->STORAGE TYPE COERCION
//-----------------------------------------------------------------------------

/**
 * Internal state to storage state converter
 *
 * @internal
 */
function
bi_i2s
    (internal_state : bi_state)
    : bis_state
{
    // convert keypairs
    let i_keypairs : Array<bi_nacl_keypair>  = internal_state.keypairs;
    let s_keypairs : Array<bis_nacl_keypair> = i_keypairs.map(bi_i2s_keypair);

    return {jr_state : {keypairs: s_keypairs}};
}



/**
 * JSONify a keypair
 *
 * basically turn each array into numbers
 *
 * @internal
 */
function
bi_i2s_keypair
    (i_keypair : bi_nacl_keypair)
    : bis_nacl_keypair
{
    let i_secretKey : Uint8Array    = i_keypair.secretKey;
    let i_publicKey : Uint8Array    = i_keypair.publicKey;
    let s_secretKey : Array<number> = bi_i2s_bytes2nums(i_secretKey);
    let s_publicKey : Array<number> = bi_i2s_bytes2nums(i_publicKey);
    return {secretKey : s_secretKey,
            publicKey : s_publicKey};
}



/**
 * Convert a byte array to an array of numbers
 *
 * @internal
 */
function
bi_i2s_bytes2nums
    (bytes: Uint8Array)
    : Array<number>
{
    let arr : Array<number> = [];
    for (let this_byte of bytes) {
        arr.push(this_byte);
    }
    return arr;
}



/**
 * Default state for JR
 *
 * Note
 * 1. This returns the *internal* state that lives in RAM, **NOT** what is
 *    stored in browser storage
 * 2. This function is **NOT** deterministic. It randomly generates a keypair.
 *
 * @internal
 */
function
bi_state_default
    ()
    : bi_state
{
    console.log('jr_state_default');
    // if no key, generate one
    // @ts-ignore ts doesn't like that nacl is dumb. i don't like it either
    let init_keypair  : bi_nacl_keypair = nacl.sign.keyPair() as bi_nacl_keypair;
    let default_state : bi_state        = { keypairs: [init_keypair] };
    console.log('jr_state_default default_state', default_state);
    return default_state;
}



//-----------------------------------------------------------------------------
// INTERNALS: STORAGE->INTERNAL TYPE COERCION
//-----------------------------------------------------------------------------

/**
 * Storage -> internal state converter
 *
 * @internal
 */
function
bi_s2i
    (s_state : bis_state)
    : bi_state
{
    // for now bis_state is just keypairs
    let s_keypairs : Array<bis_nacl_keypair> = s_state.jr_state.keypairs;

    // convert numbers to byte array
    function nums2bytes(nums: Array<number>): Uint8Array {
        return new Uint8Array(nums);
    }

    // convert storage keypair to normal keypair
    function keypair_s2i(s_keypair: bis_nacl_keypair): bi_nacl_keypair {
        let s_secretKey : Array<number> = s_keypair.secretKey;
        let s_publicKey : Array<number> = s_keypair.publicKey;
        let i_secretKey : Uint8Array    = nums2bytes(s_secretKey);
        let i_publicKey : Uint8Array    = nums2bytes(s_publicKey);
        return {secretKey : i_secretKey,
                publicKey : i_publicKey};
    }

    // convert each keypair
    let i_keypairs : Array<bi_nacl_keypair> = s_keypairs.map(keypair_s2i);

    return {keypairs: i_keypairs};
}




/**
 * Quoth https://github.com/aeternity/Vanillae/blob/f054744bbceb957afa8fbcf31d93055dd277396b/sidekick/src/sidekick.ts#L926-L1015
 *
 * > In order to exclude the possibility of someone using this functionality to
 * > trick the user into signing a transaction, the wallet salts and hashes the
 * > message, and *then* signs the salted/hashed message.
 * >
 * > Therefore, naively attempting to verify the signature will not work. You
 * > must apply the same preprocessing steps as the wallet, **THEN** check the
 * > signature against the salted/hashed message.
 * >
 * > ```erlang
 * > -spec hashed_salted_msg(Message) -> HashedSaltedMessage
 * >     when Message             :: binary(),
 * >          HashedSaltedMessage :: binary().
 * > % @doc Salt the message then hash with blake2b. See:
 * > % 1. https://github.com/aeternity/aepp-sdk-js/blob/370f1e30064ad0239ba59931908d9aba0a2e86b6/src/utils/crypto.ts#L83-L85
 * > % 2. https://github.com/aeternity/eblake2/blob/60a079f00d72d1bfcc25de8e6996d28f912db3fd/src/eblake2.erl#L23-L25
 * >
 * > hashed_salted_msg(Msg) ->
 * >     {ok, HSMsg} = eblake2:blake2b(32, salted_msg(Msg)),
 * >     HSMsg.
 * >
 * >
 * >
 * > -spec salted_msg(Message) -> SaltedMessage
 * >     when Message       :: binary(),
 * >          SaltedMessage :: binary().
 * > % @doc Salt the message the way Superhero does before signing.
 * > %
 * > % See: https://github.com/aeternity/aepp-sdk-js/blob/370f1e30064ad0239ba59931908d9aba0a2e86b6/src/utils/crypto.ts#L171-L175
 * >
 * > salted_msg(Msg) when is_binary(Msg) ->
 * >     P = <<"aeternity Signed Message:\n">>,
 * >     {ok, SP}   = btc_varuint_encode(byte_size(P)),
 * >     {ok, SMsg} = btc_varuint_encode(byte_size(Msg)),
 * >     <<SP/binary,
 * >       P/binary,
 * >       SMsg/binary,
 * >       Msg/binary>>.
 * >
 * >
 * >
 * > -spec btc_varuint_encode(Integer) -> Result
 * >     when Integer :: integer(),
 * >          Result  :: {ok, Encoded :: binary()}
 * >                   | {error, Reason :: term()}.
 * > % @doc Bitcoin varuint encode
 * > %
 * > % See: https://en.bitcoin.it/wiki/Protocol_documentation#Variable_length_integer
 * >
 * > btc_varuint_encode(N) when N < 0 ->
 * >     {error, {negative_N, N}};
 * > btc_varuint_encode(N) when N < 16#FD ->
 * >     {ok, <<N>>};
 * > btc_varuint_encode(N) when N =< 16#FFFF ->
 * >     NBytes = eu(N, 2),
 * >     {ok, <<16#FD, NBytes/binary>>};
 * > btc_varuint_encode(N) when N =< 16#FFFF_FFFF ->
 * >     NBytes = eu(N, 4),
 * >     {ok, <<16#FE, NBytes/binary>>};
 * > btc_varuint_encode(N) when N < (2 bsl 64) ->
 * >     NBytes = eu(N, 8),
 * >     {ok, <<16#FF, NBytes/binary>>}.
 * >
 * > % eu = encode unsigned (little endian with a given byte width)
 * > % means add zero bytes to the end as needed
 * > eu(N, Size) ->
 * >     Bytes = binary:encode_unsigned(N, little),
 * >     NExtraZeros = Size - byte_size(Bytes),
 * >     ExtraZeros = << <<0>> || _ <- lists:seq(1, NExtraZeros) >>,
 * >     <<Bytes/binary, ExtraZeros/binary>>.
 * > ```
 */
function
hash_and_salt_msg
    (message_str : string)
    : Uint8Array
{
    let message_bytes : Uint8Array = vdk_binary.encode_utf8(message_str);
    let salted_bytes  : Uint8Array = salt_msg(message_bytes);
    return hash(salted_bytes);
}


/**
 * Blake2 hash of data
 */
function
hash
    (data_bytes : Uint8Array)
    : Uint8Array
{
    return blake2b.blake2b(data_bytes,      // bytes to hash
                           undefined,       // key (optional)
                           32);             // resulting byte length
}


/**
 * salt the message
 *
 * ```erlang
 * -spec salted_msg(Message) -> SaltedMessage
 *     when Message       :: binary(),
 *          SaltedMessage :: binary().
 * % @doc Salt the message the way Superhero does before signing.
 * %
 * % See: https://github.com/aeternity/aepp-sdk-js/blob/370f1e30064ad0239ba59931908d9aba0a2e86b6/src/utils/crypto.ts#L171-L175
 *
 * salted_msg(Msg) when is_binary(Msg) ->
 *     P = <<"aeternity Signed Message:\n">>,
 *     {ok, SP}   = btc_varuint_encode(byte_size(P)),
 *     {ok, SMsg} = btc_varuint_encode(byte_size(Msg)),
 *     <<SP/binary,
 *       P/binary,
 *       SMsg/binary,
 *       Msg/binary>>.
 * ```
 */
function
salt_msg
    (msg_bytes : Uint8Array)
    : Uint8Array
{
    let prefix_str        : string     = 'aeternity Signed Message:\n';
    let prefix_bytes      : Uint8Array = vdk_binary.encode_utf8(prefix_str);
    let prefix_size_n     : number     = prefix_bytes.byteLength;
    let prefix_size_bytes : Uint8Array = btc_varuint_encode(prefix_size_n);
    let msg_size_n        : number     = msg_bytes.byteLength;
    let msg_size_bytes    : Uint8Array = btc_varuint_encode(msg_size_n);

    return vdk_binary.bytes_concat_arr([prefix_size_bytes,
                                        prefix_bytes,
                                        msg_size_bytes,
                                        msg_bytes]);
}



/**
 * btc varuint encoding
 *
 * function is the following Erlang code translated into TS
 *
 * ```erlang
 * -spec btc_varuint_encode(Integer) -> Result
 *     when Integer :: integer(),
 *          Result  :: {ok, Encoded :: binary()}
 *                   | {error, Reason :: term()}.
 * % @doc Bitcoin varuint encode
 * %
 * % See: https://en.bitcoin.it/wiki/Protocol_documentation#Variable_length_integer
 *
 * btc_varuint_encode(N) when N < 0 ->
 *     {error, {negative_N, N}};
 * btc_varuint_encode(N) when N < 16#FD ->
 *     {ok, <<N>>};
 * btc_varuint_encode(N) when N =< 16#FFFF ->
 *     NBytes = eu(N, 2),
 *     {ok, <<16#FD, NBytes/binary>>};
 * btc_varuint_encode(N) when N =< 16#FFFF_FFFF ->
 *     NBytes = eu(N, 4),
 *     {ok, <<16#FE, NBytes/binary>>};
 * btc_varuint_encode(N) when N < (2 bsl 64) ->
 *     NBytes = eu(N, 8),
 *     {ok, <<16#FF, NBytes/binary>>}.
 * ```
 */
function
btc_varuint_encode
    (n : number)
    : Uint8Array
{
    if
    (n < 0) {
        throw new Error('n < 0');
    }
    else if
    (n < 0xFD) {
        return new Uint8Array([n]);
    }
    else if
    (n < 0xFFFF) {
        let prefix  : Uint8Array = new Uint8Array([0xFD]);
        let n_bytes : Uint8Array = eu(n, 2);
        return vdk_binary.bytes_concat(prefix, n_bytes);
    }
    else if
    (n < 0xFFFF_FFFF) {
        let prefix  : Uint8Array = new Uint8Array([0xFE]);
        let n_bytes : Uint8Array = eu(n, 4);
        return vdk_binary.bytes_concat(prefix, n_bytes);
    }
    else {
        let prefix  : Uint8Array = new Uint8Array([0xFF]);
        let n_bytes : Uint8Array = eu(n, 8);
        return vdk_binary.bytes_concat(prefix, n_bytes);
    }
}



/**
 * unsigned integer little endian encoding with a given byte width
 *
 * @internal
 */
function
eu
    (n          : number,
     byte_width : number)
    : Uint8Array
{
    // endianness is byte-level not bit-level
    // 3> binary:encode_unsigned(258, big).
    // <<1,2>>
    // 4> binary:encode_unsigned(258, little).
    // <<2,1>>

    // first encode n as little endian
    let n_bytes         : Uint8Array = vdk_binary.bigint_to_bytes_little(BigInt(n));
    // figure out how much padding we need
    let num_extra_zeros : number     = byte_width - n_bytes.byteLength;
    let extra_zeros     : Uint8Array = vdk_binary.bytes_zeros(num_extra_zeros);

    // in little endian, padding 0s go on the right
    return vdk_binary.bytes_concat(n_bytes, extra_zeros);
}
