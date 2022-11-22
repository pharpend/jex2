%%% @doc
%%% jex: jex
%%%
%%% This module is currently named `jex', but you may want to change that.
%%% Remember that changing the name in `-module()' below requires renaming
%%% this file, and it is recommended to run `zx update .app` in the main
%%% project directory to make sure the ebin/jex.app file stays in
%%% sync with the project whenever you add, remove or rename a module.
%%% @end

-module(jex).
-vsn("0.1.0").
-export([start/1]).
-compile([export_all, nowarn_export_all]).

-include("$zx_include/zx_logger.hrl").


-spec start(ArgV) -> ok
    when ArgV :: [string()].

start(ArgV) ->
    ok = log(info, "ArgV: ~tp", [ArgV]),
    ok = dispatch(ArgV),
    %ok.
    zx:silent_stop().

help() ->
    tell(info, "~ts~n", [help_screen()]).


% TODONE: make tsdocs
% TODONE: jex pull
% TODONE: delete before mindist
% TODONE: delete before push
% TODONE: delete before pushdocs
% TODONE: jex viewdocs PKG [port]
% TODONE: jex fulldist
% TODO: jex install
% TODO: jex get_mindist PKG

% TODO: use less than full qualified names (not priority)
% TODO: make fulldist for arbitrary installed package (requires storing jex.eterms, not hard but also not a priority)
% TODO: be smart about creating jex_include
% TODO: tarball shas
% TODO: tarball signatures
% TODO: jex install

help_screen() ->
    ["Jex: simple JavaScript packaging system\n"
     "\n"
     "If you have never run jex before, you need to run `jex init` first\n"
     "\n"
     "PORCELAIN COMMANDS:\n"
     "  dwim-                   build project but don't make a release (init, pull, build)\n"
     "  dwim+                   build and make a minimal release (init, pull, build, mindist, push)\n"
     "  dwim++                  build and make a full release (init, pull, build, mindist, push, mkdocs, pushdocs)\n"
     "  ls                      list installed packages\n"
     "  install [TARBALL_PATH]  install the given package\n"
     "  viewdocs [PKG [PORT]]   view package docs for PKG in browser\n"
     "  get_mindist [PKG]       get the mindist tarball for an installed package\n"
     "\n"
     "PLUMBING COMMANDS:\n"
     "  init                    mkdir -p $HOME/.jex/{dev,docs,tmp}\n"
     "  build                   tsc && cp -r ./src/jex_include ./dist/\n"
     "      -w, --weak              continue building even if tsc fails\n"
     "      -f, --force             use cp -rf instead of cp -r\n"
     "  mindist                 mkdir jex_mindist && cp -r src jex_mindist && cp -r dist jex_mindist && rm -r jex_mindist/src/jex_include\n"
     "      -f, --force             use cp -rf instead of cp -r\n"
     "  push                    rsync -a jex_mindist/ PKG_DEVDIR\n"
     "  mkdocs                  (maybe run dwim- first) npx typedoc\n"
     "  pushdocs                rsync -a docs/ PKG_DOCSDIR\n"
     "  rmpkg PKG               rm -r $HOME/.jex/dev/PKG\n"
     "  pull                    pull each dependency into src/jx_include\n"
     "  fulldist                make a release tarball for current package\n"
     "\n"
     "DEBUG COMMANDS\n"
     "  man                     show the manual\n"
     "  tree                    tree $HOME/.jex/\n"
     "  cfgbarf                 barf out the jex.eterms file (mostly to make sure it parses correctly)\n"
     "  echo home               echo $HOME\n"
     "  echo jexdir             echo $HOME/.jex\n"
     "  echo devdir             echo $HOME/.jex/dev\n"
     "  echo docsdir            echo $HOME/.jex/docs\n"
     "  echo tmpdir             echo $HOME/.jex/tmp\n"
     "  echo pkgname            name of current package\n"
     "  echo pkg_devdir         echo $HOME/.jex/dev/realm-name-X.Y.Z\n"
     "  echo pkg_devdir PKG     echo $HOME/.jex/dev/PKG\n"
     "  echo pkg_docsdir        echo $HOME/.jex/docs/realm-name-X.Y.Z\n"
     "  echo pkg_docsdir PKG    echo $HOME/.jex/docs/PKG\n"
     "  echo pkg_tmpdir         echo $HOME/.jex/tmp/realm-name-X.Y.Z\n"
     "  echo pkg_tmpdir PKG     echo $HOME/.jex/tmp/PKG\n"
     "  echo deps               list dependencies of current package\n"
     "  echo serverpid [PORT]   show the pid for the documentation server, if alive\n"
    ].


%% Porcelain
dispatch(["dwim-"])                        -> dwim(minus);
dispatch(["dwim+"])                        -> dwim(plus);
dispatch(["dwim++"])                       -> dwim(plus_plus);
dispatch(["ls"])                           -> ls();
dispatch(["viewdocs"])                     -> viewdocs();
dispatch(["viewdocs", Pkg])                -> viewdocs(Pkg);
dispatch(["viewdocs", Pkg, Port])          -> viewdocs(Pkg, Port);
%% plumbing
dispatch(["init"])                         -> init();
dispatch(["build" | Opts])                 -> build(Opts);
dispatch(["mindist" | Opts])               -> mindist(Opts);
dispatch(["push"])                         -> push();
dispatch(["mkdocs"])                       -> mkdocs();
dispatch(["pushdocs"])                     -> pushdocs();
dispatch(["rmpkg", Pkg])                   -> rmpkg(Pkg);
dispatch(["pull"])                         -> pull();
dispatch(["fulldist"])                     -> fulldist();
%% Debug
dispatch(["man"])                          -> man();
dispatch(["tree"])                         -> tree();
dispatch(["cfgbarf"])                      -> cfgbarf();
dispatch(["echo", "home"])                 -> echo(home);
dispatch(["echo", "jexdir"])               -> echo(jexdir);
dispatch(["echo", "devdir"])               -> echo(devdir);
dispatch(["echo", "docsdir"])              -> echo(docsdir);
dispatch(["echo", "tmpdir"])               -> echo(tmpdir);
dispatch(["echo", "pkgname"])              -> echo(pkgname);
dispatch(["echo", "pkg_devdir"])           -> echo(pkg_devdir);
dispatch(["echo", "pkg_devdir", PkgName])  -> echo({pkg_devdir, PkgName});
dispatch(["echo", "pkg_docsdir"])          -> echo(pkg_docsdir);
dispatch(["echo", "pkg_docsdir", PkgName]) -> echo({pkg_docsdir, PkgName});
dispatch(["echo", "deps"])                 -> echo(deps);
dispatch(["echo", "serverpid"])            -> echo(serverpid);
dispatch(["echo", "serverpid", Port])      -> echo({serverpid, Port});
dispatch(_)                                -> help().



%%-----------------------------------------------------------------------------
%% jex man
%%-----------------------------------------------------------------------------

man() ->
    ManFile = filename:join([zx:get_home(), "priv", "MANUAL.txt"]),
    {ok, ManBytes} = file:read_file(ManFile),
    tell(info, "~ts~n", [string:chomp(ManBytes)]).
    %os:cmd(io_lib:format("less ~ts", [ManFile])),
    %ok.


%%-----------------------------------------------------------------------------
%% jex dwim
%%-----------------------------------------------------------------------------

dwim(minus) ->
    init(),
    pull(),
    build([]);
dwim(plus) ->
    dwim(minus),
    mindist([]),
    push();
dwim(plus_plus) ->
    dwim(plus),
    mkdocs(),
    pushdocs().


%%-----------------------------------------------------------------------------
%% jex cfgbarf
%%-----------------------------------------------------------------------------

cfgbarf() ->
    tell(info, "~tp~n", [file:consult("jex.eterms")]).


cfg() ->
    file:consult("jex.eterms").

%%-----------------------------------------------------------------------------
%% jex echo
%%-----------------------------------------------------------------------------

echo(home) ->
    tell(info, "~ts", [home()]);
echo(jexdir) ->
    tell(info, "~ts", [jexdir()]);
echo(devdir) ->
    tell(info, "~ts", [devdir()]);
echo(docsdir) ->
    tell(info, "~ts", [docsdir()]);
echo(tmpdir) ->
    tell(info, "~ts", [tmpdir()]);
echo(pkgname) ->
    tell(info, "~ts", [pkgname()]);
echo(pkg_devdir) ->
    {_Exists, PkgDevDir} = pkg_devdir(),
    tell(info, "~ts", [PkgDevDir]);
echo({pkg_devdir, PkgName}) ->
    case pkg_devdir(PkgName) of
        {exists, Dir} -> tell(info, "~ts", [Dir]);
        Error         -> tell(error, "Error: ~tp", [Error])
    end;
echo(pkg_docsdir) ->
    {_Exists, PkgDocsDir} = pkg_docsdir(),
    tell(info, "~ts", [PkgDocsDir]);
echo({pkg_docsdir, PkgName}) ->
    case pkg_docsdir(PkgName) of
        {exists, Dir} -> tell(info, "~ts", [Dir]);
        Error         -> tell(error, "Error: ~tp", [Error])
    end;
echo(pkg_tmpdir) ->
    {_Exists, PkgTmpDir} = pkg_tmpdir(),
    tell(info, "~ts", [PkgTmpDir]);
echo({pkg_tmpdir, PkgName}) ->
    case pkg_tmpdir(PkgName) of
        {exists, Dir} -> tell(info, "~ts", [Dir]);
        Error         -> tell(error, "Error: ~tp", [Error])
    end;
echo(deps) ->
    PrintDep = fun(Dep) -> tell(info, "~ts", [Dep]) end,
    lists:foreach(PrintDep, deps());
echo(serverpid) ->
    tell(info, "~ts~n", [serverpid(6969)]);
echo({serverpid, PortS}) ->
    PortN = list_to_integer(PortS),
    tell(info, "~ts~n", [serverpid(PortN)]).


home() ->
    case os:getenv("HOME") of
        false -> error("You are running some retard system that doesn't have $HOME defined. Fuck off");
        HomeD -> HomeD
    end.


jexdir() ->
    filename:join(home(), ".jex").

devdir() ->
    filename:join(jexdir(), "dev").

docsdir() ->
    filename:join(jexdir(), "docs").

tmpdir() ->
    filename:join(jexdir(), "tmp").

pkgname() ->
    {ok, Cfg} = cfg(),
    Realm = proplists:get_value(realm, Cfg),
    Name  = proplists:get_value(name, Cfg),
    Vsn   = proplists:get_value(version, Cfg),
    io_lib:format("~tp-~tp-~ts", [Realm, Name, Vsn]).



pkg_devdir() ->
    pkg_devdir(pkgname()).

pkg_devdir(Pkg) ->
    Filename = filename:join(devdir(), Pkg),
    case file_exists(Filename) of
        true    -> {exists, Filename};
        false   -> {dne, Filename}
    end.


pkg_docsdir() ->
    pkg_docsdir(pkgname()).

pkg_docsdir(PkgName) ->
    Filename = filename:join([docsdir(), PkgName]),
    case file_exists(Filename) of
        true    -> {exists, Filename};
        false   -> {dne, Filename}
    end.



pkg_tmpdir() ->
    pkg_tmpdir(pkgname()).

pkg_tmpdir(PkgName) ->
    Filename = filename:join([tmpdir(), PkgName]),
    case file_exists(Filename) of
        true    -> {exists, Filename};
        false   -> {dne, Filename}
    end.



deps() ->
    {ok, Cfg} = cfg(),
    case proplists:get_value(deps, Cfg) of
        undefined ->
            error("jex.eterms is missing key `deps`");
        Deps ->
            Deps
    end.



file_exists(Filename) ->
    case file:read_file_info(Filename) of
        {ok, _}    -> true;
        {error, _} -> false
    end.



%%-----------------------------------------------------------------------------
%% jex init
%%-----------------------------------------------------------------------------

init() ->
    _  = cmd(["mkdir -p ", devdir()]),
    _  = cmd(["mkdir -p ", docsdir()]),
    _  = cmd(["mkdir -p ", tmpdir()]),
    ok.



%%-----------------------------------------------------------------------------
%% jex build
%%-----------------------------------------------------------------------------

build(Opts) ->
                 % flags              if flag         default
    OptsConfig = [{["-w", "--weak"],  {weak, weak},   {weak, strict}},
                  {["-f", "--force"], {force, force}, {force, dont_force}}],
    #{force := Force, weak := Weak} = parseopts(OptsConfig, Opts),
    _  = cmd("mkdir -p src/jex_include"),
    ok = tsc(Weak),
    ok = cp_jex_include(Force),
    ok.
    %ok.

tsc(strict) ->
    "" = cmd("tsc"),
    ok;
tsc(weak) ->
    _ = cmd("tsc"),
    ok.

cp_jex_include(dont_force) ->
    _ = cmd("cp -rv src/jex_include dist"),
    ok;
cp_jex_include(force) ->
    _ = cmd("cp -rvf src/jex_include dist"),
    ok.



%%-----------------------------------------------------------------------------
%% jex mindist
%%-----------------------------------------------------------------------------

mindist(Opts) ->
                 % flags              if flag         default
    OptsConfig = [{["-f", "--force"], {force, force}, {force, dont_force}}],
    #{force := Force} = parseopts(OptsConfig, Opts),
    ok =
        case file_exists("jex_mindist") of
            true  -> _ = cmd("rm -r jex_mindist"), ok;
            false -> ok
        end,
    _ = cmd("mkdir -p jex_mindist"),
    _ = mindist_cp(Force),
    _ = cmd("rm -r jex_mindist/src/jex_include"),
    ok.

mindist_cp(dont_force) ->
    _ = cmd("rsync -avv --exclude=\"*.swp\" --exclude=\"*.swo\" src  jex_mindist"),
    _ = cmd("cp -rv                                             dist jex_mindist"),
    ok;
mindist_cp(force) ->
    _ = cmd("cp -rvf src  jex_mindist"),
    _ = cmd("cp -rvf dist jex_mindist"),
    ok.



%%-----------------------------------------------------------------------------
%% jex push
%%-----------------------------------------------------------------------------

push() ->
    case pkg_devdir() of
        {exists, Dest} ->
            _ = cmd(["rm -r ", Dest]),
            _ = cmd(["rsync -avv jex_mindist/ ", Dest]),
            ok;
        {dne, Dest} ->
            _ = cmd(["rsync -avv jex_mindist/ ", Dest]),
            ok
    end.


%%-----------------------------------------------------------------------------
%% jex ls
%%-----------------------------------------------------------------------------

ls() ->
    _ = cmd(io_lib:format("ls ~ts", [devdir()])),
    ok.

%%-----------------------------------------------------------------------------
%% jex tree
%%-----------------------------------------------------------------------------

tree() ->
    _ = cmd(io_lib:format("tree ~ts", [jexdir()])),
    ok.

%%-----------------------------------------------------------------------------
%% jex rmpkg Pkg
%%-----------------------------------------------------------------------------

rmpkg(Pkg) ->
    case pkg_devdir(Pkg) of
        {exists, Filename} -> cmd(io_lib:format("rm -r ~ts", [Filename]));
        {dne, _ilename}    -> tell(error, "package not installed: ~ts", [Pkg])
    end,
    case pkg_docsdir(Pkg) of
        {exists, Filename2} -> cmd(io_lib:format("rm -r ~ts", [Filename2]));
        {dne, _ilename2}    -> tell(error, "documentation not installed: ~ts", [Pkg])
    end,
    ok.

%%-----------------------------------------------------------------------------
%% jex pull
%%-----------------------------------------------------------------------------

pull() ->
    pull(deps()).

pull([Dep | Deps]) ->
    pull_dep(Dep),
    pull(Deps);
pull([]) ->
    tell(info, "no more dependencies to pull", []),
    ok.

pull_dep(Dep) ->
    case pkg_devdir(Dep) of
        {exists, Src} ->
            Dst = filename:join("./src/jex_include", Dep),
            _ = cmd(io_lib:format("mkdir -p ~ts", [Dst])),
            %tell(info, "path of ~s: ~s", [Dep, Src]),
            _ = cmd(io_lib:format("rsync -avv ~ts/ ~ts", [Src, Dst]));
        DNE ->
            error(DNE)
    end,
    ok.

%%-----------------------------------------------------------------------------
%% jex mkdocs
%%-----------------------------------------------------------------------------

mkdocs() ->
    _ = cmd("npx typedoc --entryPointStrategy expand --sort source-order src"),
    ok.

%%-----------------------------------------------------------------------------
%% jex pushdocs
%%-----------------------------------------------------------------------------

pushdocs() ->
    {_Exists, DocsDestDir} = pkg_docsdir(),
    _ = cmd(["rm -r ", DocsDestDir]),
    _ = cmd(["rsync -avv docs/ ", DocsDestDir]),
    ok.


%%-----------------------------------------------------------------------------
%% jex viewdocs
%%-----------------------------------------------------------------------------


viewdocs() ->
    viewdocs(all, 6969).

viewdocs(PkgName) ->
    viewdocs(PkgName, 6969).

viewdocs(all, Port) ->
    ok = ensure_docserver(Port),
    firefox(all, Port);
viewdocs(PkgName, Port) ->
    ok = ensure_docserver(Port),
    case pkg_docsdir(PkgName) of
        {exists, _} -> firefox(PkgName, Port);
        DNE         -> error(DNE)
    end.

% if the server is up, just return, otherwise, spin it up
ensure_docserver(Port) ->
    case serverpid(Port) of
        ""   -> spawn(fun() -> servedocs(docsdir(), Port) end), ok;
        _Pid -> ok
    end.

servedocs(DocsPath, Port) ->
    _  = cmd(io_lib:format("cd ~ts && ~ts", [DocsPath, pythoncmd(Port)])),
    ok.

pythoncmd(Port) ->
    io_lib:format("python3 -m http.server ~tp", [Port]).


firefox(all, Port) ->
    _ = cmd(io_lib:format("firefox localhost:~tp", [Port])),
    ok;
firefox(PkgName, Port) ->
    _ = cmd(io_lib:format("firefox localhost:~tp/~ts", [Port, PkgName])),
    ok.

serverpid(Port) ->
    string:chomp(cmd(io_lib:format("ps ax | grep '~ts' | grep --invert-match grep | awk '{print $1}'", [pythoncmd(Port)]))).


%%-----------------------------------------------------------------------------
%% jex fulldist
%%-----------------------------------------------------------------------------

fulldist() ->
    PkgName = pkgname(),
    PkgTmpDir =
        case pkg_tmpdir() of
            {exists, D} ->
                _ = cmd(io_lib:format("rm -r ~ts", [D])),
                D;
            {dne, D} ->
                D
        end,
    ReadmePath = srsly_readme_path(),
    _ = cmdf("mkdir -p ~ts",          [PkgTmpDir]),
    _ = cmdf("cp    jex.eterms  ~ts", [PkgTmpDir]),
    _ = cmdf("cp -r docs        ~ts", [PkgTmpDir]),
    _ = cmdf("cp -r jex_mindist ~ts", [PkgTmpDir]),
    _ = cmdf("cp    ~ts         ~ts", [ReadmePath, PkgTmpDir]),
    GenTmpDir = tmpdir(),
    {ok, OriginalDir} = file:get_cwd(),
    _ = cmdf("cd ~ts"
             "&& tar -czf ~ts.tar.gz ~ts"
             "&& rm -r ~ts"
             "&& mv ~ts.tar.gz ~ts",
             [GenTmpDir,
              PkgName, PkgName,
              PkgName,
              PkgName, OriginalDir]),
    ok.




srsly_readme_path() ->
    filename:join([zx:get_home(), "priv", "SERIOUSLY_README.txt"]).


%%-----------------------------------------------------------------------------
%% INTERNALS
%%-----------------------------------------------------------------------------

cmdf(Format, Args) ->
    cmd(io_lib:format(Format, Args)).

cmd(Command) ->
    ok = tell("$ ~ts", [Command]),
    S  = os:cmd(Command),
    ok = tell("~ts", [S]),
    S.

parseopts(OptsConfig, Opts) ->
    log(info, "OptsConfig: ~tp", [OptsConfig]),
    log(info, "Opts: ~tp", [Opts]),
    DefaultOpts = default_opts(OptsConfig, #{}),
    log(info, "DefaultOpts: ~tp", [DefaultOpts]),
    Updater = updater(OptsConfig, #{}),
    log(info, "Updater: ~tp", [Updater]),
    Flags = getflags(Opts, []),
    UpdatedFlags = update_flags(Flags, Updater, DefaultOpts),
    log(info, "UpdatedFlags: ~tp", [UpdatedFlags]),
    UpdatedFlags.

update_flags([Flag | Rest], Updater, AccFlags) ->
    NewAcc =
        case maps:find(Flag, Updater) of
            {ok, {NewFlag, NewValue}} ->
                AccFlags#{NewFlag => NewValue};
            error ->
                error(["invalid flag", Flag])
        end,
    update_flags(Rest, Updater, NewAcc);
update_flags([], _Updater, FinalAcc) ->
    FinalAcc.

updater([{DashedFlags, IfFlag, _Def} | Rest], Acc) ->
    UndashedFlags = getflags(DashedFlags, []),
    Flagger =
        fun (UndashedFlag, UndashedFlagToOptionMap) ->
            UndashedFlagToOptionMap#{UndashedFlag => IfFlag}
        end,
    NewAcc = lists:foldl(Flagger, Acc, UndashedFlags),
    updater(Rest, NewAcc);
updater([], Acc) ->
    Acc.

default_opts([{_X, _Y, {Z, W}} | Rest], Acc) ->
    default_opts(Rest, Acc#{Z => W});
default_opts([], FinalAcc) ->
    FinalAcc.

% --flag (long flag)
getflags(["--"++LongFlag | Flags], Acc) ->
    NewAcc = [LongFlag | Acc],
    getflags(Flags, NewAcc);
% -xyz (many short flags)
getflags(["-"++ShortFlags | Flags], Acc) ->
    NewAcc = lists:map(fun(Char) -> [Char] end, ShortFlags) ++ Acc,
    getflags(Flags, NewAcc);
% no more options
getflags([], FinalAcc) ->
    FinalAcc.
