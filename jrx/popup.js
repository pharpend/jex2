/**
 * This is the script for the popup window
 */

//import {default as nacl} from './nacl.js';

/**
 * runs whenever the popup opens
 */
async function
main()
{
    // detect button action
    document.getElementById('mk-detectable').onclick = mk_detectable;
    document.getElementById('generate').onclick = generate_keypair;

    // delete keypairs
    // browser.storage.local.clear();
    relist_keypairs();
}



/**
 * Tells the content script to spam the event bus with detection messages
 */
async function
mk_detectable()
{
    let ati = await active_tab_id();
    browser.tabs.sendMessage(ati,               // active tab
                             'mk-detectable');  // message
    document.getElementById('mk-detectable').disabled = true;
    // FIXME: update button with detect info
}


/**
 * gets the id of the current tab
 */
async function
active_tab_id()
{
    let active_tabs = await browser.tabs.query({active: true, currentWindow: true});
    return active_tabs[0].id;
}


/**
 * clear the list of keypairs and relist
 *
 * clearing is so this can be a re-entry call
 */
function
relist_keypairs()
{
    // delete all list items
    pfizer(document.getElementById('keypairs'));
    // look for keypairs then relist
    browser.storage.local.get('keypairs').then(handle_keypairs, (err) => { console.error(err); } );
}

/**
 * kill all child nodes in the dom
 */
function
pfizer(elt)
{
    while (elt.firstChild) {
        elt.removeChild(elt.firstChild);
    }
}


/**
 * This function is called in the init phase (after the user clicks the popup)
 *
 * If we have keypairs, put them in the keypairs element in the popup window
 *
 * Example call objects:
 *
 * Case of no keypairs:
 *
 * ```js
 * obj = {}
 * ```
 *
 * Case of a named keypair
 *
 * ```js
 * obj = {
 *     keypairs: [
 *         {
 *             name: string,
 *             publicKey: uint8array
 *             secretKey: uint8array
 *         },
 *         {
 *             name: string,
 *             publicKey: uint8array
 *             secretKey: uint8array
 *         }
 *     ]
 * }
 * ```
 */
function
handle_keypairs(obj)
{
    logln('handle_keypairs');
    // branch on if there are no keypairs
    // no 'keypairs' key
    if (!!!obj.keypairs) {
        no_keypairs();
    }
    // 'keypairs' key but points to empty array
    else if (0 === obj.keypairs.length) {
        no_keypairs();
    }
    else {
        ls_keypairs(obj.keypairs);
    }
}


/**
 * function called if there are no keypairs
 */
function
no_keypairs()
{
    logln('no keypairs!');
    document.getElementById('no-keypairs').hidden = false;
}


/**
 * This function is called when the user clicks the button to generate a keypair
 */
function
generate_keypair()
{
    logln('generating a keypair');
    let keypair = nacl.sign.keyPair();
    keypair.name = "Untitled Keypair 1";
    // fixme: ADD keypair (factor out into separate function)
    browser.storage.local.set({'keypairs': [keypair]});
    relist_keypairs();
}



/**
 * This function is called in the case where there is at least one keypair, and
 * it renders the list of keypairs
 */
function
ls_keypairs(keypairs)
{
    logln('keypairs!');
    console.log('keypairs: ', keypairs)
    // make keypair list visible
    let keypairs_ul = document.getElementById('keypairs');
    keypairs_ul.hidden = false;
    // render each keypair
    for (let kp of keypairs) {
        console.log(kp);
        render_keypair(keypairs_ul, kp);
    }
    //let keypairs_json = JSON.stringify(keypairs, undefined, 4);
    //document.getElementById('keypairs').innerHTML = keypairs_json;
}


/**
 * This renders a single keypair item in the list of keypairs
 */
function
render_keypair(parent_ul, {name, publicKey})
{
    // create the element
    let li = document.createElement('li');
    li.innerHTML += name;
    parent_ul.appendChild(li);
}



/**
 * Console.log the message and put it in the log thing
 */
function
logln(message)
{
    console.log(message);
    document.getElementById('log').innerHTML += message;
    document.getElementById('log').innerHTML += '\n';
}

/**
 * send the given message to the tab
 */


main();
