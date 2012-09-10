var TopBar = {
    $view: null,
    $title: null,
    $closeButton: null,

    init: function() {
        var self = this;

        self.$view = document.querySelector('#top');
        self.$closeButton = self.$view.querySelector('.close-button');
        self.$title = self.$view.querySelector('.title');

        self.$closeButton.onclick = function() {
            window.close();
        }
    },

    setTitle: function(title) {
        this.$title.innerHTML = title;
    }
}
