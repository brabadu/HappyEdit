function Tab(file) {
    var self = this;
    this.file = file;
    this.$title = document.createElement('span');
    this.$title.innerHTML = file.name;
    this.$view = document.createElement('li');
    this.$view.appendChild(this.$title);

    this.select = function() {
        if (TopBar.selectedTab) {
            removeClass(TopBar.selectedTab.$view, 'selected');
        }

        addClass(self.$view, 'selected');
        TopBar.selectedTab = self;

        if (self.file !== window.currentFile) {
            window.switchToFile(self.file, false);
        }
    };

    this.close = function(selectClosestSibling) {
        var i = TopBar.getIndexForTab(this);
        if (selectClosestSibling) {
            var closestSibling;
            if (i === TopBar.tabs.length - 1) {
                closestSibling = TopBar.tabs[i - 1];
            } else {
                closestSibling = TopBar.tabs[i + 1];
            }
            closestSibling.select();
        }
        TopBar.tabs.splice(i, 1);
        TopBar.$tabs.removeChild(this.$view);
    };

    this.$view.onclick = this.select;
};

var TopBar = {
    $view: null,
    $closeButton: null,
    $tabs: null,
    selectedTab: null,
    tabs: [],

    init: function() {
        var self = this;

        self.$view = document.querySelector('#top');
        self.$closeButton = self.$view.querySelector('.close-button');
        self.$tabs = self.$view.querySelector('.tabs');

        self.$closeButton.onclick = function() {
            window.close();
        }
    },

    getTabForFile: function(file) {
        var i;
        for (i = 0; i < this.tabs.length; i += 1) {
            if (file === this.tabs[i].file) {
                return this.tabs[i];
            }
        }
    },

    getIndexForTab: function(tab) {
        var i;
        for (i = 0; i < this.tabs.length; i += 1) {
            if (tab === this.tabs[i]) {
                return i;
            }
        }
    },

    selectTabAtIndex: function(i) {
        if (i >= this.tabs.length) {
            i = 0;
        } else if (i < 0) {
            i = this.tabs.length - 1;
        }
        this.tabs[i].select();
    },

    nextTab: function() {
        var i = this.getIndexForTab(this.selectedTab);
        this.selectTabAtIndex(i += 1);
    },

    prevTab: function() {
        var i = this.getIndexForTab(this.selectedTab);
        this.selectTabAtIndex(i -= 1);
    },

    updateView: function(file) {
        var self = this;
        var tab = self.getTabForFile(file);
        if (tab === undefined) {
            tab = new Tab(file);
            self.tabs.push(tab);
            self.$tabs.appendChild(tab.$view);
        }
        tab.select();
    }
}
