# jex2

## Installation/Usage

Jex is very much a work in progress, so these instructions are subject to
change, and may not work anymore by the time you are reading this

0.  Install system dependencies
    ```
    tree rsync
    ```
1.  `git clone https://github.com/pharpend/jex2.git`
2.  [Install Erlang and zx](https://www.bitchute.com/video/1gCvcoPUR7eJ/)
3.  Install NPM ["How to install NPM without getting AIDS"](../../docs/npm-misc/README.md)
4.  Install TypeScript `npm install -g typescript`
5.  Edit `~/.bashrc` (or `~/.zshrc` or whatever) and add

    ```
    alias jex="zx rundir ~/path/to/this/directory"
    ```

```
Jex: simple JavaScript packaging system

QUICK REFERENCE
  You have a package tarball and want to install it ->
      jex install foo-bar-X.Y.Z.tar.gz
  You are in the current directory of a project and want to build it ->
      jex install
  There is a package installed and you need its mindist to put on a server or something ->
      jex get_mindist foo-bar-X.Y.Z   # must use fully qualified package name

PORCELAIN COMMANDS:
  dwim-                   build project but don't make a release (init, clean, pull, build)
      -w, --weak              (on `jex build` step) continue building even if tsc fails
      -f, --force             (on `jex build` step) use cp -rf instead of cp -r
  dwim+                   build and make a minimal release (init, clean, pull, build, mindist, push)
      -w, --weak              (on `jex build` step) continue building even if tsc fails
      -f, --force             (on `jex build` step) use cp -rf instead of cp -r
  dwim++                  build and make a full release (init, clean, pull, build, mindist, push, mkdocs, pushdocs)
      -w, --weak              (on `jex build` step) continue building even if tsc fails
      -f, --force             (on `jex build` step) use cp -rf instead of cp -r
  install                 synonym for dwim++
      -w, --weak              (on `jex build` step) continue building even if tsc fails
      -f, --force             (on `jex build` step) use cp -rf instead of cp -r
  extinstall TARGZ_PATH   install a prebuilt jex package
  ls                      list installed packages
  viewdocs [PKG [PORT]]   view package docs for PKG in browser
  get_mindist [PKG]       get the mindist tarball for an installed package

PLUMBING COMMANDS:
  init                    mkdir -p $HOME/.jex/{dev,docs,tmp}
  clean                   rm -r ./src/jex_include && rm -r dist
  build                   tsc && cp -r ./src/jex_include ./dist/
      -w, --weak              continue building even if tsc fails
      -f, --force             use cp -rf instead of cp -r
  mindist                 mkdir jex_mindist && cp -r src jex_mindist && cp -r dist jex_mindist && rm -r jex_mindist/src/jex_include
      -f, --force             use cp -rf instead of cp -r
  push                    rsync -a jex_mindist/ PKG_DEVDIR
  mkdocs                  (maybe run dwim- first) npx typedoc
  pushdocs                rsync -a docs/ PKG_DOCSDIR
  rmpkg PKG               rm -r $HOME/.jex/dev/PKG
  pull                    pull each dependency into src/jx_include
  fulldist                make a release tarball for current package

DEBUG COMMANDS
  man                     show the manual
  tree                    tree $HOME/.jex/
  cfgbarf                 barf out the jex.eterms file (mostly to make sure it parses correctly)
  echo home               echo $HOME
  echo jexdir             echo $HOME/.jex
  echo devdir             echo $HOME/.jex/dev
  echo docsdir            echo $HOME/.jex/docs
  echo tmpdir             echo $HOME/.jex/tmp
  echo pkg_devdir         echo $HOME/.jex/dev/realm-name-X.Y.Z
  echo pkg_devdir PKG     echo $HOME/.jex/dev/PKG
  echo pkg_docsdir        echo $HOME/.jex/docs/realm-name-X.Y.Z
  echo pkg_docsdir PKG    echo $HOME/.jex/docs/PKG
  echo pkg_name           name of current package
  echo pkg_type           type of current package
  echo deps               list dependencies of current package
  echo serverpid [PORT]   show the pid for the documentation server, if alive
```


## About

jex was written because I hate NPM and refuse to use it because the entire
premise of it is insane (see: [Cannon
Conjugate](https://zxq9.com/archives/2869)).

jex is written to satisfy my own usage cases and against exactly the software I
happen to have installed on my system (rsync, etc), and against my development
workflow, and against my preferences regarding product deployment. For
instance, I don't do bundling/minification. I prefer to ship users JavaScript
that is human-readable. I simply ship a small enough volume of JavaScript that
this is not an issue for my users.

My use case is that I have many products I develop (browser extensions and
client-side libs, not Node applications) written in TypeScript, and they have
common library dependencies. I have written most of these libraries myself, and
the number of external libraries is small enough that I can keep them
up-to-date by hand.

Jex manages the flow of developing a library while not breaking the
dependents of that library (local packaging, essentially). It also solves the
problem of packaging the libraries for anyone else who wants to use them.

Jex's interface is exactly unconfusing enough that I can kind of remember how to
use it, and jex doesn't break important things often enough that it's worth the
pain to go back and think through how to structure the interface correctly.

If you have suggestions or patches or whatever to make jex less insane, I'm all
ears.

As of now (October 2024), Jex is a glorified shell script that automates a lot
of the tedium in building sidekick, JR, etc.

The long-term goal is to completely remove any dependency on NPM.  NPM comes
with a lot of unfixable security issues that present an unacceptable risk in a
business context, which is the focus of the Vanillae project.

This isn't something like yarn where it's the same thing as NPM but it is
prettier or something. Totally different packaging concept.

### Differences from NPM


1.  **Minimizing dynamicism**

    The basic assumption of NPM is that everything works all the time, and
    because that isn't true, nothing ever works and everything is always
    broken.  The basic assumption of Jex is that nothing ever works and
    everything is always broken, and because that's true, everything works all
    the time, sometimes.

    Concretely, this means that you have to do all dependency management
    manually. If you are trying to build package `A` and it depends on packages
    `B`, `C`, and `D`, then you have to go find packages `B`, `C`, and `D`,
    build them and then go back and build package `A`.

    Again, the assumption (objectively true) is that everything is always
    broken.  So on the off chance that something works by happenstance, Jex's
    strategy is to give it the Ted Williams treatment and never touch it ever
    again.

    There's an implicit assumption here that the total volume of JavaScript
    code is fairly small.  Manual dependency management is not feasible if your
    project has 11,000 dependencies, requires 18 different packages called
    "babel" just to build, and "minifies" to a 20kb opaque blob.  As a
    guideline, if the number of external package dependencies grows large
    enough that a single developer cannot manage them manually, then, (over
    time) the primary activity of said developer becomes trying to get all the
    different packages to play nicely together.

    In other words, manual dependency management is inescapable.  Jex is simply
    honest about that fact and prevents you from digging yourself into a hole.

2.  **Node is bad**

    The next departure from NPM is that we don't care at all about the node
    runtime.  JavaScript was invented by Satan as a joke.  Using JavaScript at
    all for any reason is a terrible idea.  It is an especially terrible idea
    to write any code in JavaScript that does not absolutely have to be written
    in JavaScript.

    All that is to say, whenever we write JavaScript code, the assumption is
    that the code will be run in a browser and only in a browser.

    We are never writing generic libraries that could either run in the browser
    or run in the node runtime.
