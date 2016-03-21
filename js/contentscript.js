/* global chrome */
(function( undefined ) {

    window.addEventListener( 'wrc-extension-resize', function( evt ) {

        var evtData = evt.detail;

        chrome.runtime.sendMessage({
            type: 'updateWindow',
            evtData: evtData
        });

    }, false );

    chrome.runtime.onMessage.addListener(function( msg, sender, sendResponse ) {

        console.log('got message');

        if ( msg && msg.type === 'webRequest' ) {

            console.log( 'onMessage', msg );
        }

        if ( msg && msg.type === 'some' ) {

            var i = 0;
            while ( i < 5000000 ) {

                i = i + 1;
            }

            console.log( 'ready to response' );

            sendResponse({ msg: 'I got your message.' });
        }
    });
})();
