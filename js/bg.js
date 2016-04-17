/*global Common */
/* jshint unused: true */

var REQUEST_TIMEOUT = 60 * 1000;

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
            id: id,
            tabId: details.tabId,
            state: options.state,
            type: options.type,
            details: details,
            timer: timer
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
}

function timeout( key ) {

    var conn = connections.find(function( v ) {

        return v.key === key;
    });

    if ( conn && conn.state === 'before' ) {

        conn.timer = null;
        conn.state = 'timeout';
    }
}
/*
chrome.storage.local.get( 'setting', function( storage ) {

    // load clear hosts
    clearHashHosts = storage.setting && storage.setting.clearHashHost || [];
});

chrome.storage.onChanged.addListener(function( changed ) {

    if ( changed.setting ) {

        clearHashHosts = changed.setting.newValue.clearHashHost;
    }
});
*/

chrome.runtime.onMessage.addListener(function( request, sender, sendResponse ) {

    var tasks;
    var tabId = sender && sender.tab && sender.tab.id;

    if ( request.type === 'save-running-tasks' ) {

        if ( isNaN( +tabId )) {

            throw 'save-object tab id not found. TabId was: ' + tabId;
        }

        if ( !request.data ) {

            return;
        }

        tabsObj[tabId] = tabsObj[tabId] || {};
        tabsObj[tabId].tasks = request.data;

        chrome.browserAction.setBadgeText({ text: 'Run' });
        chrome.browserAction.setBadgeBackgroundColor({ color: '#265a88' });

        sendResponse();
    }

    if ( request.type === 'is-run-onload' ) {

        var result;

        if ( isNaN( +tabId )) {

            throw 'is-run-onload tab id not found. TabId was: ' + tabId;
        }

        result = popup.runOnLoads.find(( v ) => {

            return v === tabId;
        });

        sendResponse( !!result );
    }

    if ( request.type === 'load-tasks' ) {

        if ( isNaN( +tabId )) {

            throw 'load-task tab id not found. TabId was: ' + tabId;
        }

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

    if ( request.type === 'next-task' ) {

        if ( isNaN( +tabId )) {

            throw 'next-task tab id not found. TabId was: ' + tabId;
        }

        tasks = ( tabsObj[tabId] || {}).tasks;

        if ( Array.isArray( tasks )) {

            if ( !tasks.length ) {

                chrome.browserAction.setBadgeText({ text: 'End' });
                setTimeout(function() {

                    chrome.browserAction.setBadgeText({ text: '' });
                }, 1000 );

                sendResponse( null );
                return;
            }

            sendResponse({
                task: tasks.shift()
            });

            chrome.browserAction.setBadgeText({ text: '' + tasks.length });

        } else {

            sendResponse( null );
        }
    }

    if ( request.type === 'listen-connection-changed' ) {

        if ( isNaN( +tabId )) {

            throw 'listen-connection-changed tab id not found. TabId was: ' + tabId;
        }

        listeningTabs[tabId] = true;

        // we have to send back response cos process will start after response callback.
        sendResponse();
    }

    if ( request.type === 'ignore-connection-changed' ) {

        if ( isNaN( +tabId )) {

            throw 'ignore-connection-changed tab id not found. TabId was: ' + tabId;
        }

        delete listeningTabs[tabId];

        connections = connections.filter(function( v ) {

            return v.tabId !== tabId;
        });

        // we have to send back response cos process will start after response callback.
        sendResponse();
    }

    if ( request.type === 'get-connection' ) {

        if ( isNaN( +tabId )) {

            throw 'get-connection tab id not found. TabId was: ' + tabId;
        }

        sendResponse( connections.filter(function( v ) {

            return v.tabId === tabId;
        }));
    }

    if ( request.type === 'task-failed' ) {

        if ( isNaN( +tabId )) {

            throw 'task-failed tab id not found. TabId was: ' + tabId;
        }

        delete listeningTabs[tabId];

        connections = connections.filter(function( v ) {

            return v.tabId !== tabId;
        });

        chrome.browserAction.setBadgeText({ text: 'Fail' });
        chrome.browserAction.setBadgeBackgroundColor({ color: '#ff0000' });

        setTimeout(function() {

            chrome.browserAction.setBadgeText({ text: '' });
        }, 2000 );

        sendResponse();
    }
});

/*
chrome.webRequest.onBeforeRequest.addListener(function( details ) {

    // console.log( 'onBeforeRequest', details );

    var url = details.url;
    var redirect;

    if ( clearHashHosts.length && url.match( /#.*$/ig )) {

        clearHashHosts.forEach(function( u ) {

            if ( url.indexOf( u ) >= 0 ) {

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
*/

chrome.tabs.onRemoved.addListener(function( tabId, removeInfo ) {

    // clear about removed tab
    popup.runOnLoads = popup.runOnLoads.filter(function( v ) {

        return v !== tabId;
    });

    delete listeningTabs[tabId];
    delete tabsObj[tabId];

    console.log( 'tabId', arguments, popup[tabId] );
});

chrome.commands.onCommand.addListener(function( command ) {

    if ( command === 'run-default-tasks' ) {

        Common.messageToTab({ active: true }, { type: 'run-task' });
    }
});

console.log( 'i am bg' );
