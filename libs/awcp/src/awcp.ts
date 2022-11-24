/**
 * # AWCP: aepp-waellet communication protocol
 *
 * Suppose you are the aepp and you want to communicate with a waellet. What
 * you do is pick an `EventTarget` (typically `window`), and listen to its
 * `MessageEvent`s, via something like
 *
 * ```typescript
 * window.addEventListener('message', my_listener);
 * ```
 *
 * You then communicate with the wallet by sending messages back over the
 * `EventTarget`
 *
 * This module defines the shape of the messages that are sent. There are several
 * layers to the onion, each corresponding to natural branch points in the
 * protocol.
 *
 * 1.  The `MessageEvent` layer.  This is what is actually sent as an event.
 *     This is an opaque object that is built into every runtime's standard
 *     library: https://developer.mozilla.org/en-US/docs/Web/API/MessageEvent
 *
 *     The `MessageEvent` has a field called `data`, which corresponds to the
 *     next layer.
 *
 * 2.  The `EventData` layer. This is what goes in `message_event.data`. The
 *     structure that goes in here is one of
 *
 *     1. `EventData_W2A`: waellet-to-aepp
 *     2. `EventData_A2W`: aepp-to-waellet
 *
 *     This layer corresponds to the "am I supposed to pay attention to this
 *     event?" branch point.
 *
 *     Those data structures mentioned above have two fields.
 *
 *     1. `type` is a string which is either `"to_aepp"` or `"to_waellet"`
 *     2. `data` contains the next layer
 *
 *     ```typescript
 *     type EventData_W2A
 *         <t extends any>
 *         = {type : "to_aepp",
 *            data : t};
 *     ```
 *
 *     ``` typescript
 *     type EventData_A2W
 *         <t extends any>
 *         = {type : "to_waellet",
 *            data : t};
 *     ```
 *
 *
 * 3.  We're at `message_event.data.data`. The idiom here is "JSON RPC", which
 *     is sort of a poor man's HTTP.
 *
 *     In general, the wallet is the server and the aepp is the client.
 *
 *     If you are the aepp, usually you are handling a response to a request
 *     you sent to the waellet.  For instance, you formed a transaction and
 *     sent it to the waellet to sign, and the waellet is sending you back
 *     either the signed transaction or an error (e.g. user rejected the
 *     transaction).
 *
 *     The exception to this pattern is the wallet notifying you that it
 *     exists, which is the only time the waellet sends a request (a "cast", or
 *     a "notification") to the aepp.  __In no event does the aepp send a
 *     response to the waellet.__
 *
 *     I am not 100% sure what RPC stands for, but it will be helpful to think
 *     about it as "remote procedure call". More below. This layer roughly
 *     corresponds to the "given that I am supposed to pay attention to this
 *     event, what am I supposed to do with this information?"
 *
 *     All requests have a `method` field (a string) and a `params` field (an
 *     object).  There are two types of requests:
 *
 *     1. "casts" (the RPC standard calls these "notifications").  These do not
 *        need a response.  This is only used for the waellet announcing it
 *        exists.
 *
 *     2. "calls".  These have an `id` field, and get a response.  These are
 *        used when the aepp is requesting the waellet to do something.  The
 *        response will have the same `id` field and the same `method` field.
 *
 * 4.  So far nothing we've talked about is specific to Aeternity, Vanillae,
 *     JR, or sidekick. This fourth layer is the actual semantics of the
 *     messaging protocol between the aepp and the waellet.
 *
 *     By analogy, the first two layers are developing something like TCP.  The
 *     third layer is developing HTTP.  And this layer is the actual routing
 *     table of your website, which carries with it the expected semantics of
 *     how the website is supposed to behave.
 *
 *     This module DOES __NOT__ exhaustively define all of the communication
 *     protocol that occurs in the SDK, only the subset that I have encountered
 *     in practice.
 *
 * The first layer is defined by the runtime, not here. So we're starting with
 * layer 2.
 *
 * # Notes on JSON RPC 2.0
 *
 * I have subtly changed the RPC protocol to
 *
 * 1. improve it in such a way that it is easier to use in code
 * 2. more accurately represent how it is used in practice
 *
 * The only difference here is that the `params` field of requests is
 * non-optional, and must be an object (the RPC standard allows arrays).
 *
 * ## Requests
 *
 * I have adapted the verbiage here, borrowing from Erlang, to make a
 * distinction between
 *
 * 1.  casts (RPC calls these "notifications"): these
 *
 *     1. do __NOT__ have an `id` field
 *     2. __AND__ do __NOT__ require a response.
 *
 * 2.  calls: these
 *
 *     1. __DO__ have an `id` field
 *     2. __AND__ __DO__ require a response.
 *
 * The `RpcCall` and `RpcResp` data structures each have an `id_n` type
 * parameter.
 *
 * The purpose of this is to notate (and possibly enforce) at the type level
 * the constraint that, given a call with say `id = 7`, the response must also
 * have `id = 7`.
 *
 * # Links
 *
 * - `MessageEvent`s: https://developer.mozilla.org/en-US/docs/Web/API/MessageEvent
 * - JSON RPC 2.0 https://www.jsonrpc.org/specification
 *
 * @module
 */

// TODONE: enumerate RPC errors
// TODO: examples

// TODO: constants for method names


//=============================================================================
// EXPORTS
//=============================================================================


export {
    // error code constants
    ERROR_CODE_RpcInvalidTransactionError,
    ERROR_CODE_RpcBroadcastError,
    ERROR_CODE_RpcRejectedByUserError,
    ERROR_CODE_RpcUnsupportedProtocolError,
    ERROR_CODE_RpcConnectionDenyError,
    ERROR_CODE_RpcNotAuthorizeError,
    ERROR_CODE_RpcPermissionDenyError,
    ERROR_CODE_RpcInternalError,
    ERROR_CODE_RpcMethodNotFoundError,
    // Layer 2: events
    EventData_W2A,
    EventData_A2W,
    // Layer 3: RPC
    RpcError,
    RpcCast,
    RpcCall,
    RpcResp_error,
    RpcResp_ok,
    RpcResp,
    RpcResp_Any,
    // Layer 4: specific semantics
    // connection.announcePresence
    Params_W2A_connection_announcePresence,
    RpcCast_W2A_connection_announcePresence,
    EventData_W2A_connection_announcePresence,
    // connection.open
    Params_A2W_connection_open,
    Result_W2A_connection_open,
    RpcCall_A2W_connection_open,
    RpcResp_W2A_connection_open,
    EventData_A2W_connection_open,
    EventData_W2A_connection_open,
    // address.subscribe
    Params_A2W_address_subscribe,
    Result_W2A_address_subscribe,
    RpcCall_A2W_address_subscribe,
    RpcResp_W2A_address_subscribe,
    EventData_A2W_address_subscribe,
    EventData_W2A_address_subscribe,
    //// transaction.sign (propagate)
    //Params_A2W_tx_sign_yesprop,
    //Result_W2A_tx_sign_yesprop,
    //RpcCall_A2W_tx_sign_yesprop,
    //RpcResp_W2A_tx_sign_yesprop,
    //EventData_A2W_tx_sign_yesprop,
    //EventData_W2A_tx_sign_yesprop,
    // transaction.sign (do not propagate)
    Params_A2W_tx_sign_noprop,
    Result_W2A_tx_sign_noprop,
    RpcCall_A2W_tx_sign_noprop,
    RpcResp_W2A_tx_sign_noprop,
    EventData_A2W_tx_sign_noprop,
    EventData_W2A_tx_sign_noprop
    // transaction.sign (do not propagate)
    Params_A2W_msg_sign,
    Result_W2A_msg_sign,
    RpcCall_A2W_msg_sign,
    RpcResp_W2A_msg_sign,
    EventData_A2W_msg_sign,
    EventData_W2A_msg_sign
};



//=============================================================================
// LAYER 2: WHO IS THIS MESSAGE FOR
//
// The first layer is defined by the runtime, not here. So we're starting with
// layer 2.
//=============================================================================

/**
 * This is the data that is sent from the wallet to the aepp through the Event
 * bus
 */
type EventData_W2A
    <t extends any>
    = {type : "to_aepp",
       data : t};


/**
 * This is the data that is sent from the aepp to the wallet through the Event
 * bus
 */
type EventData_A2W
    <t extends any>
    = {type : "to_waellet",
       data : t};




//=============================================================================
// LAYER 3: JSON RPC 2.0
//
// It should be noted in general that the id field exists as a type parameter
// so that we can use the type system to denote ID matches in callbacks.
//
// Remember, in TypeScript's type system, values are valid types.
//
// So `(_arg0: Foo<3, string>) => Bar<3, number>` is a valid type
//=============================================================================

/**
 * `const ERROR_CODE_RpcInvalidTransactionError = 2;`
 *
 * See https://github.com/aeternity/aepp-sdk-js/blob/1065da9a46b8dbfe60a2c3e5646e7422ee7e495e/src/aepp-wallet-communication/schema.ts#L92
 */
const ERROR_CODE_RpcInvalidTransactionError = 2;

/**
 * `const ERROR_CODE_RpcBroadcastError = 3;`
 *
 * See
 * https://github.com/aeternity/aepp-sdk-js/blob/1065da9a46b8dbfe60a2c3e5646e7422ee7e495e/src/aepp-wallet-communication/schema.ts#L108
 */
const ERROR_CODE_RpcBroadcastError = 3;

/**
 * `const ERROR_CODE_RpcRejectedByUserError = 4;`
 *
 * See https://github.com/aeternity/aepp-sdk-js/blob/1065da9a46b8dbfe60a2c3e5646e7422ee7e495e/src/aepp-wallet-communication/schema.ts#L122
 */
const ERROR_CODE_RpcRejectedByUserError = 4;


/**
 * `const ERROR_CODE_RpcUnsupportedProtocolError = 5;`
 *
 * See https://github.com/aeternity/aepp-sdk-js/blob/1065da9a46b8dbfe60a2c3e5646e7422ee7e495e/src/aepp-wallet-communication/schema.ts#L140
 */
const ERROR_CODE_RpcUnsupportedProtocolError = 5;


/**
 * This error occurs when the user rejects your attempt to connect. (I think)
 *
 * The error name here is ungrammatical but following the lead of the SDK.
 *
 * `const ERROR_CODE_RpcConnectionDenyError = 9;`
 *
 * See https://github.com/aeternity/aepp-sdk-js/blob/1065da9a46b8dbfe60a2c3e5646e7422ee7e495e/src/aepp-wallet-communication/schema.ts#L155
 */
const ERROR_CODE_RpcConnectionDenyError = 9;

/**
 * This error occurs when you are not connected to the wallet.
 *
 * The error name here is ungrammatical but following the lead of the SDK.
 *
 * `const ERROR_CODE_RpcNotAuthorizeError = 10;`
 *
 * See https://github.com/aeternity/aepp-sdk-js/blob/1065da9a46b8dbfe60a2c3e5646e7422ee7e495e/src/aepp-wallet-communication/schema.ts#L171
 */
const ERROR_CODE_RpcNotAuthorizeError = 10;


/**
 * This error occurs when you are not `address.subscribe`d to the wallet (I think?)
 *
 * The error name here is ungrammatical but following the lead of the SDK.
 *
 * `const ERROR_CODE_RpcPermissionDenyError = 11;`
 *
 * See https://github.com/aeternity/aepp-sdk-js/blob/1065da9a46b8dbfe60a2c3e5646e7422ee7e495e/src/aepp-wallet-communication/schema.ts#L186
 */
const ERROR_CODE_RpcPermissionDenyError = 11;

/**
 * This is the general "something went wrong, i dunno" negative error.
 *
 * See https://github.com/aeternity/aepp-sdk-js/blob/1065da9a46b8dbfe60a2c3e5646e7422ee7e495e/src/aepp-wallet-communication/schema.ts#L196-L209
 */
const ERROR_CODE_RpcInternalError = 12;


/**
 * This is presumably the equivalent of the HTTP 404 error
 *
 * See https://github.com/aeternity/aepp-sdk-js/blob/1065da9a46b8dbfe60a2c3e5646e7422ee7e495e/src/aepp-wallet-communication/schema.ts#L211-L224
 */
const ERROR_CODE_RpcMethodNotFoundError = -32601;


/**
 * Error data inside the `error` field of a RpcResp_Err
 */
type RpcError
    = {code    : number,
       message : string,
       data?   : any};




//-----------------------------------------------------------------------------
// Requests
//-----------------------------------------------------------------------------

/**
 * This type is used for "notifications", i.e. messages sent from the client to
 * the server that do not need a response. An example is the wallet announcing
 * it exists.
 */
type RpcCast
    <method_s extends string,
     params_t extends object>
    = {jsonrpc : "2.0",
       method  : method_s,
       params  : params_t};



/**
 * This type is used for requests from the client to the server that require a
 * response.
 */
type RpcCall
    <method_s extends string,
     params_t extends object>
    = {jsonrpc : "2.0",
       id      : number | string,
       method  : method_s,
       params  : params_t};




//-----------------------------------------------------------------------------
// Responses
//-----------------------------------------------------------------------------

/**
 * This is the shape of unsuccessful responses
 */
type RpcResp_error
    <method_s extends string>
    = {jsonrpc : "2.0",
       id      : number | string,
       method  : method_s,
       error   : RpcError};



/**
 * This is the shape of successful responses
 */
type RpcResp_ok
    <method_s extends string,
     result_t extends any>
    = {jsonrpc : "2.0",
       id      : number | string,
       method  : method_s,
       result  : result_t};



/**
 * This is the shape of generic responses
 */
type RpcResp
    <method_s extends string,
     result_t extends any>
    = RpcResp_ok<method_s, result_t>
    | RpcResp_error<method_s>;



/**
 * Most generic possible response
 */
type RpcResp_Any = RpcResp<string, any>;




//=============================================================================
// LAYER 4: VANILLAE-SPECIFIC MESSAGE PROTOCOL
//
// https://github.com/aeternity/aepp-sdk-js/blob/a435e9df5c94004bcd16326b26c38a9c0b284279/src/aepp-wallet-communication/schema.ts#L32-L42
//
// Only the request/responses that I have actually encountered in practice are
// enumerated here.  There are many more things that the SDK code appears to
// use which I did not encounter in the wild.
//=============================================================================

// TODO: need to do more experimentation with superhero to see what sorts of
// messages it sends back to the other requests

//----------------------------------------------------------------------------
// connection.announcePresence
//----------------------------------------------------------------------------

/**
 * Waellet-to-aepp parameters of "connection.announcePresence" cast
 *
 * (layer 4)
 */
type Params_W2A_connection_announcePresence
    = {id     : string,
       name   : string,
       origin : string,
       type   : "window" | "extension"};



/**
 * Shape of the waellet-to-aepp "connection.announcePresence" RPC cast
 *
 * (layer 3)
 */
type RpcCast_W2A_connection_announcePresence
    = RpcCast<"connection.announcePresence",
              Params_W2A_connection_announcePresence>;


/**
 * The actual waellet-to-aepp event passed when the wallet announces it exists
 *
 * (layer 2)
 *
 * @example
 *
 * ```json
 * {
 *     "type": "to_aepp",
 *     "data": {
 *         "jsonrpc": "2.0",
 *         "method": "connection.announcePresence",
 *         "params": {
 *             "id": "{aee9e933-52b6-410a-8c3f-99c6be596b4e}",
 *             "name": "Superhero",
 *             "networkId": "ae_mainnet",
 *             "origin": "moz-extension://ee425d81-d5b2-44b6-9406-4da31b019e7c",
 *             "type": "extension"
 *         }
 *     }
 * }
 * ```
 */
type EventData_W2A_connection_announcePresence
    = EventData_W2A<RpcCast_W2A_connection_announcePresence>



//----------------------------------------------------------------------------
// connection.open
//----------------------------------------------------------------------------

/**
 * Parameters of aepp-to-waellet "connection.open" call
 *
 * (layer 4)
 */
type Params_A2W_connection_open
    = {name       : string,
       version    : 1,
       networkId? : string};


/**
 * Result type of "connection.open" call
 *
 * Same as `Params_W2A_connection_open` empirically
 *
 * (layer 4)
 */
type Result_W2A_connection_open
    = Params_W2A_connection_announcePresence;



/**
 * Shape of aepp-to-waellet "connection.open" RPC call
 *
 * (layer 3)
 */
type RpcCall_A2W_connection_open
    = RpcCall<"connection.open",
              Params_A2W_connection_open>;



/**
 * Shape of waellet-to-aepp "connection.open" RPC response
 *
 * (layer 3)
 */
type RpcResp_W2A_connection_open
    = RpcResp<"connection.open",
              Result_W2A_connection_open>;



/**
 * The actual aepp-to-waellet "connection.open" event data passed over the message bus
 *
 * (layer 2)
 */
type EventData_A2W_connection_open
    = EventData_A2W<RpcCall_A2W_connection_open>;



/**
 * The actual waellet-to-aepp "connection.open" event data passed over the message bus
 *
 * (layer 2)
 */
type EventData_W2A_connection_open
    = EventData_W2A<RpcResp_W2A_connection_open>;




//----------------------------------------------------------------------------
// address.subscribe
//----------------------------------------------------------------------------

/**
 * Parameter type of aepp-to-waellet "address.subscribe" call
 *
 * (layer 4)
 */
type Params_A2W_address_subscribe
    = {type  : "subscribe",
       value : "connected"};



/**
 * Result type of waellet-to-aepp "address.subscribe response
 *
 * (layer 4)
 *
 * @example
 * ```typescript
 * {subscription : ["connected"],
 *  address      : {current   : {"ak_2Wsa8iAmAm917evwDEZjouvPUXKx2nUv5Uz8e8oNXTDfDXnMRN": {}},
 *                  connected : {}}}
 * ```
 */
type Result_W2A_address_subscribe
    = {subscription : ["connected"],
       address      : {current   : object,
                       connected : object}};



/**
 * Shape of aepp-to-waellet "address.subscribe" RPC call
 *
 * (layer 3)
 */
type RpcCall_A2W_address_subscribe
    = RpcCall<"address.subscribe",
              Params_A2W_address_subscribe>;



/**
 * Result of waellet-to-aepp "address.subscribe" response
 *
 * (layer 3)
 */
type RpcResp_W2A_address_subscribe
    = RpcResp<"address.subscribe",
              Result_W2A_address_subscribe>;



/**
 * Actual aepp-to-waellet "address.subscribe" event data sent over the message bus
 *
 * (layer 2)
 */
type EventData_A2W_address_subscribe
    = EventData_A2W<RpcCall_A2W_address_subscribe>;



/**
 * Actual waellet-to-aepp "address.subscribe" event data sent over the message bus
 *
 * (layer 2)
 */
type EventData_W2A_address_subscribe
    = EventData_W2A<RpcResp_W2A_address_subscribe>;



//----------------------------------------------------------------------------
// transaction.sign (do not propagate)
//----------------------------------------------------------------------------

/**
 * Parameters for "transaction.sign" (do not propagate)
 *
 * (layer 4)
 */
type Params_A2W_tx_sign_noprop
    = {tx           : string,
       returnSigned : true,
       networkId    : string}



/**
 * Success result type for "transaction.sign" (do not propagate)
 *
 * (layer 4)
 */
type Result_W2A_tx_sign_noprop
    = {signedTransaction : string};


/**
 * Request type for "transaction.sign" (do not propagate)
 *
 * (layer 3)
 */
type RpcCall_A2W_tx_sign_noprop
    = RpcCall<"transaction.sign",
              Params_A2W_tx_sign_noprop>;



/**
 * Response type for "transaction.sign" (do not propagate)
 *
 * (layer 3)
 */
type RpcResp_W2A_tx_sign_noprop
    = RpcResp<"transaction.sign",
              Result_W2A_tx_sign_noprop>;



/**
 * Event data for aepp-to-waellet "transaction.sign" (do not propagate) message
 *
 * (layer 2)
 */
type EventData_A2W_tx_sign_noprop
    = EventData_A2W<RpcCall_A2W_tx_sign_noprop>;



/**
 * Event data for aepp-to-waellet "transaction.sign" (do not propagate) response
 *
 * (layer 2)
 */
type EventData_W2A_tx_sign_noprop
    = EventData_W2A<RpcResp_W2A_tx_sign_noprop>;


//----------------------------------------------------------------------------
// message.sign
//----------------------------------------------------------------------------

/**
 * Parameters for "message.sign"
 *
 * FIXME: example
 *
 * ```ts
 * {message   : 'hello world',
 *  onAccount : 'ak_...'}
 * ```
 *
 * (layer 4)
 */
type Params_A2W_msg_sign
    = {message   : string,
       onAccount : string}



/**
 * Success result type for "message.sign"
 *
 * (layer 4)
 */
type Result_W2A_msg_sign
    = {signature : string};


/**
 * Request type for "message.sign" (do not propagate)
 *
 * (layer 3)
 */
type RpcCall_A2W_msg_sign
    = RpcCall<"message.sign"
              Params_A2W_msg_sign>;



/**
 * Response type for "message.sign" (do not propagate)
 *
 * (layer 3)
 */
type RpcResp_W2A_msg_sign
    = RpcResp<"message.sign",
              Result_W2A_msg_sign>;



/**
 * Event data for aepp-to-waellet "message.sign" (do not propagate) message
 *
 * (layer 2)
 */
type EventData_A2W_msg_sign
    = EventData_A2W<RpcCall_A2W_msg_sign>;



/**
 * Event data for aepp-to-waellet "message.sign" (do not propagate) response
 *
 * (layer 2)
 */
type EventData_W2A_msg_sign
    = EventData_W2A<RpcResp_W2A_msg_sign>;
