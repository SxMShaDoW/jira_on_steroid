window.sortJiraIssues = function(dataColumnId, attr, order, valueType) {
    var mylist = $('.ghx-column[data-column-id=' + dataColumnId + ']');
    var listitems = mylist.find('.ghx-issue').get();
    listitems.sort(function(a, b) {
        var compA;
        var compB;
        if (valueType == 'string') {
            compA = $(a).attr(attr);
            compB = $(b).attr(attr);
        }
        else if (valueType == 'integer'){
            compA = parseInt($(a).attr(attr));
            compB = parseInt($(b).attr(attr));
        }

        if (order == 'asc') {
            return (compA < compB) ? -1 : (compA > compB) ? 1 : 0;
        }
        else {
            return (compA > compB) ? -1 : (compA < compB) ? 1 : 0;
        }
    });
    $.each(listitems, function(idx, itm) {
        mylist.append(itm);
    });
}


function pluginToggleStatus(){
    $('#intu-help').hide();
    $('#intu-status').toggle();
}

var hidingHeight = 0;

function pluginAdjustSpace(){
    console.log('adj space');

    var mainHeight = 0;
    if($('#ghx-plan-group').length == 0){
        mainHeight = pluginToInt($('#ghx-work').css('height'));
    }
    else {
        mainHeight = pluginToInt($('#ghx-plan-group').css('height'));
    }

    if ($('#announcement-banner').is(":visible")){
        $('#ghx-report, #ghx-work, #ghx-plan, #ghx-plan-group').css('height', mainHeight - hidingHeight);
        GH.WorkView.renderPoolAndDetailView();
    }
    else {
        $('#ghx-report, #ghx-work, #ghx-plan, #ghx-plan-group').css('height', mainHeight + hidingHeight);
    }

    // Work View
    if($('#ghx-plan-group').length == 0){
        GH.SwimlaneStalker.poolStalker(); // Move the work view column header up
    }
}

function pluginMaxSpace(){
    if (hidingHeight == 0) {
        hidingHeight = $('#announcement-banner').height() + $('header .aui-header').height() + $('#ghx-operations').height();
    }

    $('#announcement-banner, #header, #ghx-operations').toggle();

    pluginAdjustSpace();
}

function pluginClose(){
    if ($('#intu-menu-toggle').html() == 'X'){
        $('#intu-menu-container, #intu-status, #intu-help').hide();
        $('#intu-menu-toggle').html('>');
    }
    else { // '>'
        $('#intu-menu-container').show();
        $('#intu-status').hide();
        $('#intu-menu-toggle').html('X');
    }
}

function pluginToInt(str){
    return parseInt(str.substring(0, str.length - 2));
}

function pluginHelp(){
    $('#intu-status').hide();
    $('#intu-help').toggle();
}

$('#work-toggle, #plan-toggle').on('click', function(){
    hidingHeight = 0;
    $('#announcement-banner, #header, #ghx-operations').show();
});

$(window).resize(function() {
    setTimeout(function(){pluginAdjustSpace()}, 1000);
});
