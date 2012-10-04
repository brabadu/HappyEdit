HappyEdit is a Vim-inspired text editor with modern features. It is based on modern web technologies and feels like a native app.

Try it out
----------

**Building Ace:**

This step requires Node.js and npm to be installed.

```
$ cd HAPPYEDIT_CHECKOUT
$ git submodule init
$ git submodule update
$ cd ace
$ npm install
$ node Makefile.dryice.js
```

**Installing HappyEdit as a Chrome Packaged App:**

1. Make sure you run the Canary version of Google Chrome ( https://tools.google.com/dlpage/chromesxs ).
2. Go to Tools -> Extensions, enable the developer mode, then press "Load unpacked extension" and open the folder in which you cloned the HappyEdit git repo.
3. Open a new tab and click the HappyEdit icon.
