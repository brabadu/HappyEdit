function addClass(elem, className) {
    if (!elem) {
        return;
    }

    var i;
    var classNames = elem.getAttribute('class') || '';
    classNames = classNames.split(' ');

    for (i = 0; i < classNames.length; i += 1) {
        if (classNames[i] === className) {
            return;
        }
    }

    classNames.push(className);
    elem.setAttribute('class', classNames.join(' '));
}

function capFileName(filename, max) {
    var ret = filename;

    if (filename.length > max) {
        var split = filename.split('/');
        if (split.length > 1) {
            var last = split.pop();
            ret = split.join('/').substring(0, max - split[1].length - 4) + '.../' + split[1] + last;
        } else {
            ret = filename.substring(0, max-3) + '...';
        }
    }

    return ret;
}

function removeClass(elem, className) {
    if (!elem) {
        return;
    }

    var i;
    var newClassNames = [];
    var classNames = elem.getAttribute('class') || '';
    classNames = classNames.split(' ');

    for (i = 0; i < classNames.length; i += 1) {
        if (classNames[i] != className) {
            newClassNames.push(classNames[i]);
        }
    }

    elem.setAttribute('class', newClassNames.join(' '));
}

function isNumeric(num) {
    return parseFloat(num).toString() == num;
}

var ajax = {
    get: function(url, callback) {
        var xhr = new XMLHttpRequest();
        var params = params || '';
        xhr.open("GET", url);

        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) {
                callback(xhr.responseText);
            }
        };

        xhr.send();
    },
    post: function(url, params, callback) {
        var xhr = new XMLHttpRequest();
        var params = params || '';
        xhr.open("POST", url);

        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) {
                callback(xhr.responseText);
            }
        };

        xhr.send(params);
    }
}
