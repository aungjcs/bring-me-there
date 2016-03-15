(function($, undefined) {
    var l = common.l;
    var settings = null;
    var DESKNETS_DOMAIN = 'https://staffsite.japacom.jp/';

    $(function() {
        var defaultNav = location.hash.replace(/#/ig, '');

        common.loadSettings().done(function(setts) {
            settings = setts;
            init();
        });

        $('.navbar li').click(navOnClick);

        if (defaultNav !== '') {
            //初期表示の指定あり
            $('.navbar li').filter('[role-target="' + defaultNav + '"]').trigger('click');
        } else {
            //初期表示の指定なしのため先頭を表示
            $('.navbar li').first().trigger('click');
        }

        //入力項目（ラジオボタン以外）の変更時に値を保存
        $('[role=autoFill]:not(:radio)').change(function() {
            var $t = $(this);
            var saveKey = $t.attr('id');
            var val = $.trim($t.val());

            if (!saveKey) {
                return;
            }

            settings[saveKey] = val;
            common.saveSettings(settings);
        });

        ////入力項目（ラジオボタン）の変更時に値を保存
        $(':radio[role=autoFill]').change(function(evt) {
            evt.preventDefault();

            if (!$(this).prop('checked')) {
                return;
            }

            var $r = $(this);
            var name = $r.attr('name');
            var val = $r.val();

            settings[name] = val;
            common.saveSettings(settings);
        });

        $('.bs-popover').popover({
            content: popContent,
            html: true,
            placement: 'auto left',
            title: popTitle,
            trigger: 'hover'
        });

        getPopupBlock({
            primaryUrl: DESKNETS_DOMAIN
        }, function(details) {
            var setting = details.setting;
            var $r = $(':radio[name=dsMailPopup][value=' + setting + ']');

            if (!$r.length) {
                return;
            }

            setBsRadioActive($r);
        });

        //changelog取得
        $.get('CHANGELOG.md').done(function(data, status, xhr) {
            $('#changelog')
                .html(marked(data))
                .find('pre code').each(function(i, block) {
                    hljs.highlightBlock(block);
                });

            $('#changelog').find('table').addClass('table table-hover');
        });
    });

    function popTitle() {
        var selector = $(this).attr('content-selector');
        var $container = $(selector);

        if (!$container.length) {
            return;
        }

        return $container.attr('title') || null;
    }

    function popContent() {
        var selector = $(this).attr('content-selector');
        var $container = $(selector);

        if (!$container.length) {
            return;
        }

        return $container.html();
    }

    function init() {
        var inputGroups = [
            'loginId',
            'loginPass',
            'dsLoginId',
            'dsLoginPass'
        ];

        var rdoKeys = [
            'timepickerAvailable',
            'timepickerMinUnits',
            'monthMovement',
            'autoInput',
            'workingTimeCopy'
        ];

        for (var i = 0, len = inputGroups.length; i < len; i++) {
            var key = inputGroups[i];
            var val = settings[key];
            var $i = $('#' + key);

            if (!$i.length) {
                continue;
            }

            $i.val(val);
        }

        for (var i = 0, len = rdoKeys.length; i < len; i++) {
            var key = rdoKeys[i];
            var val = settings[key];
            var $rdos = $(':radio[name=' + key + ']');
            var $r = $rdos.filter('[value=' + val + ']');

            if (!$r.length) {
                continue;
            }
            setBsRadioActive($r);
        }

        //desknet'sのポップアップ解除を設定
        $(':radio[name=dsMailPopup]').change(function(evt) {
            evt.preventDefault();

            if (!$(this).prop('checked')) {
                return;
            }

            setPopupBlock({
                primaryPattern: 'https://staffsite.japacom.jp/*',
                setting: $(this).val()
            });
        });
    }

    function navOnClick() {
        var $that = $(this);

        $that.siblings('li').addBack().removeClass('active');
        $that.addClass('active');

        var target = $that.attr('role-target');

        var sections = $('.option-main').find('.option-block').hide();
        sections.filter('[role=' + target + ']').show();
    }

    function getPopupBlock(details, cb) {
        //ポップアップブロック設定
        chrome.contentSettings['popups'].get({
            primaryUrl: details.primaryUrl
        }, function(details) {
            _.isFunction(cb) && cb(details);
        });
    }

    function setPopupBlock(details) {
        //ポップアップブロック設定
        chrome.contentSettings['popups'].set({
            primaryPattern: details.primaryPattern,
            setting: details.setting
        });
    }

    function setBsRadioActive(r) {
        var $r = $(r);

        if (!$r[0]) {
            return;
        }

        $r.prop('checked', true)
            .parent('label')
            .addClass('active');
    }
})(jQuery)