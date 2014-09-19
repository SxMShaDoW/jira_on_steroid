// https://jira.intuit.com/secure/RapidBoard.jspa?rapidView=7690&view=detail&selectedIssue=LCP-480&sprint=12300

// Add script.js to the document
var s = document.createElement('script');
s.src = chrome.extension.getURL('script.js');
(document.head||document.documentElement).appendChild(s);
s.onload = function() {
    s.parentNode.removeChild(s);
};

// Put hovercard to the document
$('body').append("<div class='hovercard'></div>");

var labelTexts = ['FailedQA','InQA','PullRequest','Blocked'];
var labelColors = ['#f3add0','#FFFF99','#77fcfc','#dfb892']; // "#66FFFF"
var labelOrders = [1,2,3,4]; // 3 is reserved for PullRequest
var pullRequestColor = "#77fcfc";
var pullRequestOrder = 3;
var githubIssues = [];
var githubUserName = ''
var githubPassword = ''

var statusCounts = {New: 0, InProgress: 0, Blocked: 0, Verify: 0, Closed: 0, Deferred: 0};
var statusStoryPoints = {New: 0, InProgress: 0, Blocked: 0, Verify: 0, Closed: 0, Deferred: 0};

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

window.callGithub = function() {
    var github = new window.Github({
        username: githubUserName,
        password: githubPassword,
        auth: "basic"
    });
    var issues = github.getIssues('live-community', 'live_community');
    githubIssues = [];
    issues.list('open', function(err, cb_issues) {
        githubIssues = cb_issues;
    });
}

window.updateJiraBoard = function() {
    var sprintID = getParameterByName('sprint');
    var rapidViewID = getParameterByName('rapidView');

    $('.intu-error').remove();
    if (sprintID.length == 0 && rapidViewID.length == 0) {
//        $('#ghx-board-name').append("<span class='intu-error'>Select a sprint to enable issue highlighting</span>");
    }
    else {
        var apiURL = '';
        if (sprintID.length > 0) {
            getJiraIssues(sprintID);
        }
        else {
            $.get("https://jira.intuit.com/rest/greenhopper/1.0/xboard/work/allData/?rapidViewId=" + rapidViewID, function( data ) {
                var sprintID = data.sprintsData.sprints[0].id;
                getJiraIssues(sprintID);
            });
        }
    }
}

function getJiraIssues(sprintID){
    $.get( "https://jira.intuit.com/rest/api/latest/search?jql=sprint%3D"+sprintID+"&fields=" +
        "key,created,updated,status,summary,description,parent,labels,customfield_11703,customfield_14107,priority,subtasks,assignee,issuelinks&maxResults=200", function( data ) {
        var arrIssueToSort = [];

        $('.intu-jira-label .intu-jira-label-left').remove();

        data.issues.forEach(function(issue) {
            var elIssue = $("div[data-issue-key='" + issue.key + "'].ghx-issue");
            if (elIssue.length == 0) return; // in case the card doesn't exist on the UI

            resetIssue(elIssue);

            var fields = issue.fields;

            setIssueAttributesTo(elIssue, fields);

            addHovercardTo(elIssue, fields);

//                var prInfo = '';
//                if (githubIssues.length > 0){
//                    prInfo = gitPullRequestLabel(fields.summary, elIssue);
//                }
//                var displayLabel = buildDisplayLabel(fields.labels, prInfo, elIssue, arrIssueToSort);
//                addLabelTo(elIssue, displayLabel);
        });

        addStats(statusCounts, statusStoryPoints);
        addSortToColumnHeader();

//            arrIssueToSort.sort(sortByLabelOrder);
//
//            for(var i=0; i < arrIssueToSort.length; i++){
//                $(arrIssueToSort[i]).parent().prepend(arrIssueToSort[i]);
//            }

    }, "json");

}

if (githubUserName.length > 0 && githubPassword.length > 0) {
    window.callGithub();
}

window.updateJiraBoard();

//setInterval(function(){window.updateJiraBoard()}, 5000);

function addStats(statusCounts, statusStoryPoints){
    var strStatusCounts = '';
    Object.keys(statusCounts).forEach(function (key) {
        var value = statusCounts[key];
        strStatusCounts += key + " : <strong>" + value + "</strong> ";
    });

    var strStatusStoryPoints = '';
    Object.keys(statusStoryPoints).forEach(function (key) {
        var value = statusStoryPoints[key];
        strStatusStoryPoints += key + " : <strong>" + value + "</strong> ";
    });

    $('#ghx-rabid').append(
        "<div class='intu-jira-status'>" +
            "<div><strong>Number of Issues : </strong>" + strStatusCounts + "</div>" +
            "<div><strong>Number of Story Points : </strong>" + strStatusStoryPoints + "</div></div>"
    );
}

function addHovercardTo(elIssue, fields){

    // Subtasks
    var subtaskHtml = '';
    var subtaskKeys = [];

    fields.subtasks.forEach(function(subtask) {
        subtaskKeys.push(subtask.key);
        subtaskHtml += "<p>" + subtask.key + ' ' + subtask.fields.summary + " (" + subtask.fields.status.name + ")</p>";
    });
    if(subtaskHtml.length > 0) subtaskHtml = '<h3>Sub tasks</h3>' + subtaskHtml;

    // Parent
    var parentHtml = '';
    var parentKey = [];
    if (fields.parent) {
        parentKey.push(fields.parent.key);
        parentHtml += "<p>" + fields.parent.key + ' ' + fields.parent.fields.summary + " (" + fields.parent.fields.status.name + ")</p>";
    }
    if(parentHtml.length > 0) parentHtml = '<h3>Parent</h3>' + parentHtml;

    // Blocking and Blocked By
    var blocking = "";
    var blockedBy = "";
    var blockHtml = "";
    var blocks = [];

    fields.issuelinks.forEach(function(issuelink) {
        if(issuelink.type.name == 'Blocks'){
            if(issuelink.outwardIssue) { // means blocking this key
                blocking += (issuelink.outwardIssue.key + ' ');
                blocks.push(issuelink.outwardIssue.key);
                blockHtml += "<p>Blocking: " + issuelink.outwardIssue.key + ' ' + issuelink.outwardIssue.fields.summary + " (" + issuelink.outwardIssue.fields.status.name + ")</p>";
            }
            else if(issuelink.inwardIssue) { // means this issue is blocked by this key
                blockedBy += (issuelink.inwardIssue.key) + ' ';
                blocks.push(issuelink.inwardIssue.key);
                blockHtml += "<p>Blocked By: " + issuelink.inwardIssue.key + ' ' + issuelink.inwardIssue.fields.summary + " (" + issuelink.inwardIssue.fields.status.name + ")</p>";
            }
        }
    });

    if (blocking.length > 0) blocking = "Blocking " + blocking;
    if (blockedBy.length > 0) blockedBy = "Blocked By " + blockedBy;
    if(blockHtml.length > 0) blockHtml = '<h3>Block</h3>' + blockHtml;


    addLabelTo(elIssue, blocking + blockedBy);

    // Hygenie
    if (fields.customfield_14107 && fields.customfield_14107[0].value == 'Yes') {
        addLabelTo(elIssue, 'Hygiene', 'left');
    }

    // Status count
    statusCounts[fields.status.name.replace(' ', '')] = statusCounts[fields.status.name.replace(' ', '')] + 1;

    var storyPoint = 0;
    if (fields.customfield_11703) {
        statusStoryPoints[fields.status.name.replace(' ', '')] = statusStoryPoints[fields.status.name.replace(' ', '')] + fields.customfield_11703;
    }

    // Attach hovercard event to each jira issue element
    elIssue.find('.ghx-issue-fields:first').hovercard({
        detailsHTML:
            "<h3 style='float:left'>Status</h3>" +
                "<div style='float:right'>Crt: " + toDate(fields.created) + " Upd: " + toDate(fields.updated) +
                "</div><div style='clear:both'></div>" +
                fields.status.name +
                "<h3>Description</h3>" + $(fields.description).text().substring(0, 400) +
                parentHtml +
                subtaskHtml +
                blockHtml,
        width: 400,
        relatedIssues: subtaskKeys.concat(parentKey),
        blocks: blocks
    });
}

function toDate(string){
    var date = new Date(string);
    return date.getMonth() + "/" + date.getDay() + "/" + date.getFullYear();
}

function sortByLabelOrder(a, b) {
    return a.attr('lc-sort-order') - b.attr('lc-sort-order');
}

function resetIssue(elIssue){
    elIssue.attr('lc-sort-order', 0);
    elIssue.css("background-color", "");
    elIssue.css('background-image', 'none');
}

function setIssueAttributesTo(elIssue, fields){

    // Label
//    var label = '';
//    for(var j=0; j<labelTexts.length; j++){
//        if(fields.labels.indexOf(labelTexts[j]) > -1) {
//            label += (labelTexts[j] + ' ');
//            elIssue.css('background-color', labelColors[j]);
//            elIssue.attr('_labelOrder', labelOrders[j]);
//        }
//    }

    var storyPoint = 0;
    if (fields.customfield_11703) storyPoint = fields.customfield_11703;

    var displayName = '';
    if (fields.assignee) displayName = fields.assignee.displayName;

    var priority = 5;
    if (fields.priority) fields.priority.id;

    elIssue.attr('_displayName', displayName);
    elIssue.attr('_storyPoint', storyPoint);
    elIssue.attr('_priority', priority);
}

function buildDisplayLabel(labels, prInfo, elIssue, arrIssueToSort){
    var label = '';

    if (prInfo.length > 0) {
        elIssue.attr('lc-sort-order', pullRequestOrder);
        elIssue.css('background-color', pullRequestColor);
        arrIssueToSort.push($(elIssue));
    }

    for(var j=0; j<labelTexts.length; j++){
        var addToContents = false;

        if(labels.indexOf(labelTexts[j]) > -1) {
            label += (labelTexts[j] + ' ');
            elIssue.css('background-color', labelColors[j]);
            elIssue.attr('lc-sort-order', labelOrders[j]);

            if(!addToContents) {
                arrIssueToSort.push($(elIssue));
                addToContents = true;
            }
        }
    }

    label = label.replace('PullRequest', 'PR');

    if (prInfo.length > 0){
        if (label.indexOf('PR') >= 0){
            return label + ' - ' + prInfo;
        }
        else {
            return 'PR - ' + prInfo;
        }
    }
    else {
        return label;
    }
}

$.fn.hovercard = function(options) {
    $(this).hover(
        function(e){
            var offset = $(this).offset();
            $('.hovercard').show().offset({'top': offset.top + 100, 'left' : offset.left});
            $('.hovercard').html(options.detailsHTML);

            for(var i=0; i < options.relatedIssues.length; i++){
                var elIssue = $("div[data-issue-key='" + options.relatedIssues[i] + "'].ghx-issue");
                elIssue.css('background-color','#CCFFCC');
            }

            for(var i=0; i < options.blocks.length; i++){
                var elIssue = $("div[data-issue-key='" + options.blocks[i] + "'].ghx-issue");
                elIssue.css('background-color','#FFB9B7');
            }

            e.stopPropagation();
        },
        function(){
            $('.hovercard').hide();
            $('.hovercard').html('');

            for(var i=0; i < options.relatedIssues.length; i++){
                var elIssue = $("div[data-issue-key='" + options.relatedIssues[i] + "'].ghx-issue");
                elIssue.css('background-color','');
            }

            for(var i=0; i < options.blocks.length; i++){
                var elIssue = $("div[data-issue-key='" + options.blocks[i] + "'].ghx-issue");
                elIssue.css('background-color','');
            }
        }
    );
}


//function addLabelToIssueLeft(label, elIssue){
//    label = label.trim();
//    if (label.length > 0) {
//        elIssue.append("<div class='intu-jira-label-left'>" + label + "</div>");
//    }
//}

function addLabelTo(elIssue, label, position){
    label = label.trim();
    if (label.length > 0) {
        if (position == 'left')
            cssClass = 'intu-jira-label-left';
        else
            cssClass = "intu-jira-label";
        elIssue.append("<div class='" + cssClass + "'>" + label + "</div>");
    }
}

function gitPullRequestLabel(summary, elIssue){
    var pr = pullRequest(summary);
    if (pr == null){
        return "";
    }

    // var psUrl = pr['url'];
    var psDaysOld = Math.round(((new Date) - (new Date(pr['created_at']))) / (1000 * 60 * 60 * 24));
    var psLabel = '';

    if(pr['labels'].length > 0){
        psLabel = pr['labels'][0]['name'];
    }
    var prInfo = psLabel + ' (' + psDaysOld + ' days)';


    if (psDaysOld > 14) {
        var imgURL = chrome.extension.getURL('web.png');
        elIssue.css('background-image', 'url("' + imgURL + '")');
    }

    return prInfo;
}

function pullRequest(summary){
    var str = summary.substring(summary.trim().lastIndexOf(' ') + 1)
    if((str.length == 3 || str.length == 4) && !isNaN(str)) {
        var number = parseInt(str);
        if(githubIssues.length > 0){
            for(var p=0; p < githubIssues.length; p++){
                if(githubIssues[p]['number'] == number) {
                    return githubIssues[p];
                }
            }
        }
    }

    return null;
}

function addSortToColumnHeader(){
    $('#ghx-column-headers .ghx-column').each(function(){
        var dataId = $(this).attr('data-id');

        var sorts = {
            assignee: {
                image: "assignee.png", title: "Assignee", attr: "_displayName", order: "asc", valueType: "string"
            },
            story_points: {
                image: "story_points.png", title: "Story Points", attr: "_storyPoint", order: "desc", valueType: "integer"
            }
        }

        for(var sortKey in sorts) {
            sort = sorts[sortKey];

            var img = $('<img />').attr({
                src: chrome.extension.getURL(sort['image']),
                width:'16',
                height:'16'
            })
            var anchor = $('<a />').attr({
                title: sort['titles'],
                class: 'custom-sort',
                href: "javascript:window.sortJiraIssues('" + dataId + "', '" + sort['attr'] + "', '" + sort['order'] + "', '" + sort['valueType'] + "')"
            });

            $(this).append(anchor.append(img));
        };
    });
}
