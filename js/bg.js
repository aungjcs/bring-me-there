/*global Common */

var REQUEST_TIMEOUT = 10 * 1000;
var clearHashHosts = [];
var handleRequestTypes = ['main_frame', 'sub_frame', 'xmlhttprequest'];
var app = angular.module( 'extApp', []);
var jobs = [];
var isListening = false;
var listeningTabs = {};

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

var TaskMananger = (function() {

    var tm = {};
    var jobs = tm.jobs = {};

    tm.registerJob = function( options ) {

        // register job for tab
        jobs[options.tabId] = {};
        jobs[options.tabId].tabId = options.tabId;
        jobs[options.tabId].tasks = options.tasks;

        tm.nextTask({ tabId: options.tabId });
    };

    tm.nextTask = function( options ) {

        var job = jobs[options.tabId] || {};
        var task, wait;

        if ( !job.tasks || !job.tasks.length ) {

            return;
        }

        task = job.tasks.shift();
        wait = isNaN( +task.wait ) ? 0 : +task.wait;

        console.log( 'nextTask', options.tabId, job, task );

        setTimeout(function() {

            chrome.tabs.sendMessage( options.tabId, { type: 'exec-task', task: task });
        }, 100 + wait );
    };

    return tm;
})();

chrome.runtime.onMessage.addListener(function( request, sender, sendResponse ) {

    var tabId = sender && sender.tab && sender.tab.id;

    if ( request.type === 'run-task' ) {

        chrome.tabs.queryAsync({
            active: true,
            currentWindow: true
        }).then(function( tabs ) {

            var tabId;

            if ( !tabs.length ) {

                throw 'Active tab not found';
            }

            tabId = tabs[0].id;

            return chrome.storage.local.getAsync(['tasks']).then(function( storage ) {

                if ( !storage.tasks && !storage.tasks.length ) {

                    console.log( 'Received run-task but tasks not found.' );
                    return;
                }

                TaskMananger.registerJob({
                    tabId: tabId,
                    tasks: storage.tasks
                });
                return storage;
            });
        });
    }

    if ( request.type === 'next-task' ) {

        if ( isNaN( +tabId )) {

            throw 'next-task tab id not found. TabId was: ' + tabId;
        }

        TaskMananger.nextTask({ tabId: tabId });
    }

    if ( request.type === 'listen-connection-changed' ) {

        if ( isNaN( +tabId )) {

            throw 'next-task tab id not found. TabId was: ' + tabId;
        }

        listeningTabs[tabId] = true;
    }

    if ( request.type === 'ignore-connection-changed' ) {

        if ( isNaN( +tabId )) {

            throw 'next-task tab id not found. TabId was: ' + tabId;
        }

        delete listeningTabs[tabId];

        jobs = jobs.filter(function( v ) {

            return v.tabId !== tabId;
        });
    }

    if ( request.type === 'get-connection' ) {

        if ( isNaN( +tabId )) {

            throw 'next-task tab id not found. TabId was: ' + tabId;
        }

        sendResponse( jobs.filter(function( v ) {

            return v.tabId === tabId;
        }));
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

    chrome.tabs.create({ url: chrome.extension.getURL( 'bg.html' ) });
});

chrome.webRequest.onBeforeRequest.addListener(function( details ) {

    // console.log( 'onBeforeRequest', details );

    var url = details.url;
    var redirect;

    if ( clearHashHosts.length && url.match( /#.*$/ig )) {

        clearHashHosts.forEach(function( u ) {

            if ( url.indexOf( u ) >= 0 ) {

                messageToActiveTab({
                    type: 'webRequest',
                    data: details
                });

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

chrome.webRequest.onBeforeRequest.addListener(function( details ) {

    // console.log( 'wr onBeforeRequest', details.requestId, details.tabId, details.frameId );

    // messageToActiveTab({
    //     type: 'webRequest',
    //     data: details
    // });

    return { cancel: false };
}, {
    urls: ['<all_urls>'],
    types: handleRequestTypes
});

chrome.webRequest.onCompleted.addListener(function( details ) {

    // console.log( 'wr onCompleted', details.requestId, details.tabId, details.frameId );

    // messageToActiveTab({
    //     type: 'webRequest',
    //     data: details
    // });

    return { cancel: false };
}, {
    urls: ['<all_urls>'],
    types: handleRequestTypes
});

chrome.webNavigation.onBeforeNavigate.addListener(function( details ) {

    // console.log( 'navi onBeforeNavigate', details.processId, details.tabId, details.frameId );
}, {
    urls: ['<all_urls>']
});

chrome.webNavigation.onCompleted.addListener(function( details ) {

    // console.log( 'navi onCompleted', details.processId, details.tabId, details.frameId );
}, {
    urls: ['<all_urls>']
});

chrome.runtime.onInstalled.addListener(function( details ) {

    // messageToActiveTab( details );
});

function messageToActiveTab( msg ) {

    Common.messageToTab({
        pinned: true
    }, msg );
}

console.log( 'i am bg' );
