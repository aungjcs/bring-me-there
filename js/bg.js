/*global Common, Capture */
/* jshint unused: true */

var REQUEST_TIMEOUT = 30 * 1000;

// var clearHashHosts = [];
var handleRequestTypes = ['main_frame', 'sub_frame', 'xmlhttprequest'];
var connections = [];
var listeningTabs = {};
var tabsObj = {};
var popup = {
    runOnLoads: []
};

chrome.browserAction.setBadgeText({ text: '' });

// web request
chrome.webRequest.onBeforeRequest.addListener(function( details ) {

    updateJobs({ id: details.requestId, state: 'before', type: 'wreq' }, details );
}, {
    urls: ['<all_urls>'],
    types: handleRequestTypes
});

chrome.webRequest.onCompleted.addListener(function( details ) {

    updateJobs({ id: details.requestId, state: 'complete', type: 'wreq' }, details );
}, {
    urls: ['<all_urls>'],
    types: handleRequestTypes
});

chrome.webRequest.onErrorOccurred.addListener(function( details ) {

    updateJobs({ id: details.requestId, state: 'error', type: 'wreq' }, details );
}, {
    urls: ['<all_urls>'],
    types: handleRequestTypes
});

// web navigation
chrome.webNavigation.onBeforeNavigate.addListener(function( details ) {

    updateJobs({ id: details.processId, state: 'before', type: 'navi' }, details );
}, {
    urls: ['<all_urls>']
});

chrome.webNavigation.onCompleted.addListener(function( details ) {

    updateJobs({ id: details.processId, state: 'complete', type: 'navi' }, details );
}, {
    urls: ['<all_urls>']
});

chrome.webNavigation.onErrorOccurred.addListener(function( details ) {

    updateJobs({ id: details.processId, state: 'error', type: 'navi' }, details );
}, {
    urls: ['<all_urls>']
});

function updateJobs( options, details ) {

    var key, id, conn, timer;

    if ( !listeningTabs[details.tabId] ) {

        return;
    }

    id = options.id;
    key = id + '_' + options.type + '_' + details.tabId + '_' + details.frameId;

    if ( options.state === 'before' ) {

        connections = connections.filter( v => {

            return v.key !== key;
        });

        timer = setTimeout(function() {

            timeout( key );
        }, REQUEST_TIMEOUT );

        connections.unshift({
            key: key,
            id: Common.newId(),
            tabId: details.tabId,
            state: options.state,
            type: options.type,
            details: details,
            timer: timer,
            ts: Date.now()
        });
    } else {

        conn = connections.find( v => {

            return v.key === key;
        });

        if ( conn ) {

            conn.state = options.state;

            conn.timer && clearTimeout( conn.timer );
        }
    }

    // alert job changeds to such options page
    chrome.runtime.sendMessage( null, { type: 'jobs_state_changed' });
}

function timeout( key ) {

    var conn = connections.find(function( v ) {

        return v.key === key;
    });

    if ( conn && conn.state === 'before' ) {

        conn.timer = null;
        conn.state = 'timeout';
    }

    // alert job changeds to such options page
    chrome.runtime.sendMessage( null, { type: 'jobs_state_changed' });
}

function getConnections() {

    return connections;
}

chrome.runtime.onMessage.addListener(function( request, sender, sendResponse ) {

    var tasks;
    var tabId = sender && sender.tab && sender.tab.id;
    var type = request.type || '';
    var data = request.data || {};

    if ( type === 'document_start_loaded' ) {

        chrome.management.getSelf(function( extInfo ) {

            if ( extInfo.installType === 'development' ) {

                Common.openTab( chrome.runtime.getURL( 'options.html' ), { slient: true });
                Common.openTab( chrome.runtime.getURL( 'trace.html' ), { slient: true });
            }
        });
    }

    if ( type === 'saveSession' ) {

        tabsObj[tabId] = tabsObj[tabId] || {};

        Object.assign( tabsObj[tabId], request.data );

        // we have to send back response cos process will start after response callback.
        sendResponse();
    }

    if ( type === 'loadSession' ) {

        sendResponse( tabsObj[tabId] );
    }

    if ( type === 'setBadge' ) {

        chrome.browserAction.setBadgeText({ text: data.text });
        chrome.browserAction.setBadgeBackgroundColor({ color: data.color });

        sendResponse();
    }

    if ( type === 'inspectBg' ) {

        // for debug
        sendResponse({
            connections: connections,
            listeningTabs: listeningTabs,
            tabsObj: tabsObj,
            popup: popup
        });
    }

    if ( request.type === 'isRunOnload' ) {

        var result;

        result = popup.runOnLoads.find(( v ) => {

            return v === tabId;
        });

        sendResponse( !!result );
    }

    if ( request.type === 'load-tasks' ) {

        tasks = ( tabsObj[tabId] || {}).tasks;
        sendResponse({
            tasks: Array.isArray( tasks ) ? tasks : []
        });

        // we have to clear browserAction msg if task not left
        if ( listeningTabs[tabId] && ( !tasks || !tasks.length )) {

            delete listeningTabs[tabId];

            chrome.browserAction.setBadgeText({ text: 'End' });
            setTimeout(function() {

                chrome.browserAction.setBadgeText({ text: '' });
            }, 1000 );
        }
    }

    if ( request.type === 'listenConnectionChanged' ) {

        listeningTabs[tabId] = true;
        sendResponse();
    }

    if ( request.type === 'cleanUp' ) {

        cleanUp( tabId );
        sendResponse();
    }

    if ( request.type === 'getConnection' ) {

        sendResponse( connections.filter(function( v ) {

            return v.tabId === tabId;
        }));
    }

    if ( request.type === 'taskFailed' ) {

        cleanUp( tabId );
        sendResponse();
    }

    if ( request.type === 'screenshort' ) {

        chrome.tabs.query({ active: true, currentWindow: true }, function( tabs ) {

            if ( !tabs.length ) {

                Common.log( 'Tab not found.' );
                throw 'Tab not found.';
            }

            Capture.screenshort( tabs[0], request, sender, sendResponse );
        });

        return true;
    }

    if ( request.type === 'capture' ) {

        Capture.capture( request, sender, sendResponse );
        return true;
    }
});

function cleanUp( tabId ) {

    // cleaning up tab's session
    delete listeningTabs[tabId];
    delete tabsObj[tabId];

    connections = connections.filter(function( v ) {

        return v.tabId !== tabId;
    });
}

chrome.tabs.onRemoved.addListener(function( tabId, removeInfo ) {

    // clear about removed tab
    popup.runOnLoads = popup.runOnLoads.filter(function( v ) {

        return v !== tabId;
    });

    delete listeningTabs[tabId];
    delete tabsObj[tabId];

    console.log( 'tabId', arguments, popup[tabId] );
});

// chrome.commands.onCommand.addListener(function( command ) {

//     if ( command === 'run-default-tasks' ) {

//         Common.messageToTab({ active: true }, { type: 'run-task' });
//     }
// });

console.log( 'i am bg' );
