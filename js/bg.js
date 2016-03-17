/*global common */

var clearHashHosts = [];

chrome.storage.local.get( 'setting', function( storage ) {

    // load clear hosts
    clearHashHosts = storage.setting.clearHashHost || [];
});

function sendMsg( msg ) {

    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, function( tabs ) {

        chrome.tabs.sendMessage( tabs[0].id, msg, function( response ) {

            console.log( response );
        });
    });
}

chrome.runtime.onMessage.addListener(function( request, sender, sendResponse ) {

    if ( request.type === 'updateWindow' && request.evtData ) {

        // updateWindow( request.evtData );
    }
});

chrome.runtime.onInstalled.addListener(function() {

});

chrome.runtime.onStartup.addListener(function() {

    // ブラウザ起動時に呼ばれる
});

chrome.storage.onChanged.addListener(function( changed ) {

    clearHashHosts = changed.setting.newValue.clearHashHost;
});

/*
chrome.webRequest.onBeforeRequest.addListener(
    function( details ) {

        if ( details.url.indexOf( 'http://reload.extensions' ) >= 0 ) {

            reloadExtensions();
            chrome.tabs.get( details.tabId, function( tab ) {

                if ( tab.selected === false ) {

                    chrome.tabs.remove( details.tabId );
                }
            });
            return {

                // close the newly opened window
                redirectUrl: chrome.extension.getURL( 'close.html' )
            };
        }

        return { cancel: false };
    }, {
        urls: ['http://reload.extensions/'],
        types: ['main_frame']
    }, ['blocking']
);*/

chrome.runtime.onStartup.addListener(function() {

    console.log( 'startup' );

    // chrome.tabs.create({ url: chrome.extension.getURL( 'bg.html' ) });
});

chrome.management.onEnabled.addListener(function() {

    console.log( 'onEnabled', arguments );

    chrome.tabs.create({ url: chrome.extension.getURL( 'bg.html' ) });
});

chrome.webRequest.onBeforeRequest.addListener(function( details ) {

    // console.log( 'onBeforeRequest', details );

    var url = details.url;
    var redirect;

    if ( clearHashHosts.length && url.match( /#.*$/ig )) {

        clearHashHosts.forEach(function( u ) {

            if ( url.indexOf( u ) >= 0 ) {

                messageToActiveTab( details );

                if ( !redirect ) {

                    redirect = {
                        redirectUrl: url.match( /^[^#]+/ig )[0]
                    };
                }
            }
        });
    }

    return redirect || { cancel: false };
}, {
    urls: ['<all_urls>'],
    types: ['main_frame']
}, ['blocking']);

// chrome.webRequest.onBeforeRequest.addListener(function( details ) {

//     // console.log( 'onBeforeRequest', details );

//     var url = details.url;

//     if ( url.match( /#.*$/ig )) {

//         messageToActiveTab( details );
//         return {
//             redirectUrl: url.match( /^[^#]+/ig )[0]
//         };
//     }

//     return { cancel: false };
// }, {
//     urls: ['*://localhost:*/*'],
//     types: ['main_frame']
// }, ['blocking']);

chrome.webRequest.onCompleted.addListener(function( details ) {

    // console.log( 'onCompleted', details );
    // messageToActiveTab( details );

    return { cancel: false };
}, {
    urls: ['<all_urls>'],
    types: ['main_frame']
});

chrome.runtime.onInstalled.addListener(function( details ) {

    messageToActiveTab( details );
});

function messageToActiveTab( msg ) {

    chrome.tabs.query({
        pinned: true
    }, function( tabs ) {

        chrome.tabs.sendMessage( tabs[0].id, msg );
    });
}

console.log( 'i am bg' );
