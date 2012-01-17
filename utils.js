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
