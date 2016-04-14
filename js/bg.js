/*global Common */

var REQUEST_TIMEOUT = 60 * 1000;
var clearHashHosts = [];
var handleRequestTypes = ['main_frame', 'sub_frame', 'xmlhttprequest'];
var app = angular.module( 'extApp', []);
var jobs = [];
var isListening = false;
var listeningTabs = {};
var tabsObj = {};
var popup = {
    runOnLoads: []
};

handleRequestTypes = ['main_frame', 'sub_frame', 'xmlhttprequest'];
app.controller( 'BodyCtrl', ['$scope', '$injector', function( $scope, $injector ) {

    $scope.jobs = jobs;

    $scope.$on( 'jobs:changed', function( event, details ) {

        // console.log( 'details', details );

        $scope.$applyAsync();
    });

    $scope.setListen = function() {

        isListening = $scope.listen;
    };
}]);

app.run(['$rootScope', '$injector', function( $rootScope, $injector ) {

    // web request
    chrome.webRequest.onBeforeRequest.addListener(function( details ) {

        updateJobs({ id: details.requestId, state: 'before', type: 'wreq' }, details );
        $rootScope.$broadcast( 'jobs:changed', details );
    }, {
        urls: ['<all_urls>'],
        types: handleRequestTypes
    });

    chrome.webRequest.onCompleted.addListener(function( details ) {

        updateJobs({ id: details.requestId, state: 'complete', type: 'wreq' }, details );
        $rootScope.$broadcast( 'jobs:changed', details );
    }, {
        urls: ['<all_urls>'],
        types: handleRequestTypes
    });

    chrome.webRequest.onErrorOccurred.addListener(function( details ) {

        updateJobs({ id: details.requestId, state: 'error', type: 'wreq' }, details );
        $rootScope.$broadcast( 'jobs:changed', details );
    }, {
        urls: ['<all_urls>'],
        types: handleRequestTypes
    });

    // web navigation
    chrome.webNavigation.onBeforeNavigate.addListener(function( details ) {

        updateJobs({ id: details.processId, state: 'before', type: 'navi' }, details );
        $rootScope.$broadcast( 'jobs:changed', details );
    }, {
        urls: ['<all_urls>']
    });

    chrome.webNavigation.onCompleted.addListener(function( details ) {

        updateJobs({ id: details.processId, state: 'complete', type: 'navi' }, details );
        $rootScope.$broadcast( 'jobs:changed', details );
    }, {
        urls: ['<all_urls>']
    });

    chrome.webNavigation.onErrorOccurred.addListener(function( details ) {

        updateJobs({ id: details.processId, state: 'error', type: 'navi' }, details );
        $rootScope.$broadcast( 'jobs:changed', details );
    }, {
        urls: ['<all_urls>']
    });

    function updateJobs( options, details ) {

        var key, id, job, timer;

        if ( !listeningTabs[details.tabId] ) {

            return;
        }

        id = options.id;
        key = id + '_' + options.type + '_' + details.tabId + '_' + details.frameId;

        if ( options.state === 'before' ) {

            timer = setTimeout(function() {

                timeout( key );
            }, REQUEST_TIMEOUT );

            jobs.unshift({
                key: key,
                id: id,
                tabId: details.tabId,
                state: options.state,
                type: options.type,
                details: details,
                timer: timer
            });
        } else {

            job = jobs.find(function( v ) {

                return v.key === key;
            });

            if ( job ) {

                job.state = options.state;

                job.timer && clearTimeout( job.timer );
            }
        }
    }

    function timeout( key ) {

        var job = jobs.find(function( v ) {

            return v.key === key;
        });

        if ( job && job.state === 'before' ) {

            job.timer = null;
            job.state = 'timeout';
        }
    }
}]);

app.filter( 'byKeyVal', function() {

    return function( input, key, checkVal ) {

        input = input || [];

        return input.filter(function( v ) {

            return v[key] === checkVal;
        });
    };
});

app.filter( 'len', function() {

    return function( input ) {

        input = input || [];

        return input.length;
    };
});

chrome.storage.local.get( 'setting', function( storage ) {

    // load clear hosts
    clearHashHosts = storage.setting && storage.setting.clearHashHost || [];
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

    if ( request.type === 'load-object' ) {

        if ( isNaN( +tabId )) {

            throw 'load-object tab id not found. TabId was: ' + tabId;
        }

        sendResponse( tabsObj[tabId] );
    }

    if ( request.type === 'next-task' ) {

        var tasks;

        if ( isNaN( +tabId )) {

            throw 'next-task tab id not found. TabId was: ' + tabId;
        }

        tasks = ( tabsObj[tabId] || {}).tasks;

        if ( Array.isArray( tasks )) {

            if ( tasks.length ) {

                chrome.browserAction.setBadgeText({ text: '' + tasks.length });
            } else {

                chrome.browserAction.setBadgeText({ text: 'End' });
                setTimeout(function() {

                    chrome.browserAction.setBadgeText({ text: '' });
                }, 1000 );

            }

            sendResponse({
                task: tasks.shift()
            });

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

        jobs = jobs.filter(function( v ) {

            return v.tabId !== tabId;
        });

        // we have to send back response cos process will start after response callback.
        sendResponse();
    }

    if ( request.type === 'get-connection' ) {

        if ( isNaN( +tabId )) {

            throw 'get-connection tab id not found. TabId was: ' + tabId;
        }

        sendResponse( jobs.filter(function( v ) {

            return v.tabId === tabId;
        }));
    }

    if ( request.type === 'task-failed' ) {

        if ( isNaN( +tabId )) {

            throw 'task-failed tab id not found. TabId was: ' + tabId;
        }

        delete listeningTabs[tabId];

        jobs = jobs.filter(function( v ) {

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

chrome.runtime.onInstalled.addListener(function() {

});

chrome.runtime.onStartup.addListener(function() {

    // ブラウザ起動時に呼ばれる
});

chrome.storage.onChanged.addListener(function( changed ) {

    if ( changed.setting ) {

        clearHashHosts = changed.setting.newValue.clearHashHost;
    }
});

chrome.runtime.onStartup.addListener(function() {

    console.log( 'startup' );

    // chrome.tabs.create({ url: chrome.extension.getURL( 'bg.html' ) });
});

chrome.management.onEnabled.addListener(function() {

    console.log( 'onEnabled', arguments );

    // chrome.tabs.create({ url: chrome.extension.getURL( 'bg.html' ) });
});

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

chrome.commands.onCommand.addListener(function( command ) {

    if ( command === 'run-default-tasks' ) {

        Common.messageToTab({ active: true }, { type: 'run-task' });
    }

    if ( command === 'open-options-page' ) {

        Common.openTab( chrome.extension.getURL( 'options.html' ));
    }
});

console.log( 'i am bg' );
