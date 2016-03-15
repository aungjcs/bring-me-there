/* global chrome */
(function( undefined ) {

    window.addEventListener( 'wrc-extension-resize', function( evt ) {

        var evtData = evt.detail;

        chrome.runtime.sendMessage({
            type: 'updateWindow',
            evtData: evtData
        });

    }, false );

    chrome.runtime.onMessage.addListener(function( request, sender, sendResponse ) {

        console.log( 'onMessage', arguments );
    });
})();
