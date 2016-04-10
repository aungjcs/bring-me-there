function main() {

    var app = angular.module( 'extApp', ['mgcrea.ngStrap']);

    app.controller( 'BodyCtrl', ['$scope', '$injector', '$element', function( $scope, $injector, $element ) {

        var $timeout = $injector.get( '$timeout' );
        var $ = angular.element;
        var scope = $scope;
        var view = $scope.view = {
            scope: $scope,
            clearHashHost: [],
            jobs: [],
            tasks: [],
            types: ['click', 'text'],
            jobStatus: 'list',
            selectedJob: null,
            newJobName: ''
        };

        $scope.taskChanged = function() {

            storeSetting({
                tasks: view.tasks
            });
        };

        $scope.jobChanged = function() {

            storeSetting({
                jobs: view.jobs
            });
        };

        $scope.selectedJobChange = function() {

            storeSetting({
                selectedJobId: view.selectedJob.jobId
            });
            $scope.jobChanged();
        };

        $scope.setFocus = function( $event ) {

            $timeout(function() {

                $( $event.target ).siblings( 'input' ).focus();

            }, 10 );
        };

        $scope.newJob = function() {

            view.jobStatus = 'new';

            $timeout(function() {

                $element.find( '#newJobName' ).focus();
            }, 10 );
        };

        $scope.addJob = function() {

            if ( !view.newJobName ) {

                return;
            }

            view.jobStatus = 'list';

            view.jobs.push({
                jobId: ( new Date()).getTime(),
                jobName: view.newJobName
            });

            view.newJobName = '';

            view.selectedJob = view.jobs[view.jobs.length - 1];

            $scope.jobChanged();
            $scope.selectedJobChange();
        };

        $scope.cancleNewJob = function() {

            view.jobStatus = 'list';
        };

        $scope.addTask = function() {

            var newTask = {
                id: new Date().getTime(),
                selector: 'div#container .search button[ng-click*=addSomething]',
                type: 'click',
                wait: 0,
                memo: 'new'
            };

            view.selectedJob.tasks = view.selectedJob.tasks || [];

            view.selectedJob.tasks.push( newTask );

            $scope.jobChanged();

            $scope.$applyAsync( setSortable );
        };

        $scope.removeTask = function( task ) {

            view.selectedJob.tasks = view.selectedJob.tasks.filter(function( v ) {

                return task.id !== v.id;
            });

            $scope.jobChanged();
        };

        $scope.clearTasks = function() {

            if ( !window.confirm( 'Clear all ?' )) {

                return;
            }

            chrome.storage.local.removeAsync( 'tasks' ).then(function() {

                view.tasks.length = 0;
                $scope.$applyAsync();
            });

            $scope.$applyAsync( setSortable );
        };

        function setSortable() {

            $( '#tasks-table ' ).sortable({
                items: 'tr.task-row',
                handle: '.change-order',
                revert: true,
                placeholder: 'bg-warning sortable-placeholder',
                update: sorttableUpdated
            });
        }

        function sorttableUpdated( event, ui ) {

            var mapTasks = {};
            var $rows = ui.item.closest( 'tbody' ).find( '.task-row' );
            var sortted = [];

            view.selectedJob.tasks.forEach(function( v ) {

                mapTasks[v.id] = v;
            });

            view.selectedJob.tasks.length = 0;

            $rows.each(function() {

                var $r = $( this );
                var id = $r.data( 'task-id' );

                view.selectedJob.tasks.push( mapTasks[id] );
            });

            $scope.taskChanged();
            $scope.$applyAsync();
        }

        chrome.storage.local.getAsync(['setting', 'jobs', 'tasks', 'selectedJobId']).then(function( storage ) {

            var setting = storage.setting || {};

            view.clearHashHost = setting.clearHashHost || [];
            view.jobs = storage.jobs || [];
            view.tasks = storage.tasks || [];

            if ( storage.selectedJobId ) {

                view.selectedJob = view.jobs.find(function( v ) {

                    return v.jobId === storage.selectedJobId;
                });
            } else if ( !view.selectedJob && view.jobs.length ) {

                view.selectedJob = view.jobs[0];
            }

            $scope.$applyAsync( function() {

                setSortable();
            } );
        });

        function storeSetting( setting ) {

            return chrome.storage.local.setAsync( setting ).then(function() {

                console.log( 'saved' );
            });
        }
    }]);
}

main();
