/*global common, chrome, moment */

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

        updateWindow( request.evtData );
    }
});

chrome.runtime.onInstalled.addListener(function() {

});

chrome.runtime.onStartup.addListener(function() {

    // ブラウザ起動時に呼ばれる
});

function updateWindow( options ) {

    var _options = _.pick( options, ['top', 'left', 'width', 'height']);

    chrome.windows.getCurrent(function( winCurrent ) {

        chrome.windows.update( winCurrent.id, _options, function( winUpdated ) {

        });
    });
}
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

chrome.webRequest.onBeforeRequest.addListener(function( details ) {

    console.log( 'onBeforeRequest', details );

    return { cancel: false };
}, {
    urls: ['<all_urls>'],
    types: ['main_frame']
});

chrome.webRequest.onCompleted.addListener(function( details ) {

    console.log( 'onCompleted', details );

    return { cancel: false };
}, {
    urls: ['<all_urls>'],
    types: ['main_frame']
});

console.log( 'i am bg' );
