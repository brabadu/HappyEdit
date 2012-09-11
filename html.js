var HTML = {
    createSuggestionView: function(filename) {
        var $li = document.createElement('li');
        var $title = document.createElement('span');
        $title.setAttribute('class', 'title');
        $title.innerHTML = capFileName(filename, 50);
        $li.setAttribute('rel', filename);
        $li.appendChild($title);
        $li.setAttribute('title', filename);
        return $li;
    },
};
