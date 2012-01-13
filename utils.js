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
