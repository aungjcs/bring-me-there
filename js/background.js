/*global common, chrome, moment */
var settings = null;
var projects = [];

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
