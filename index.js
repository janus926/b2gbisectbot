var fs = require('fs');
var path = require('path');
var execSync = require('child_process').execSync;
var spawnSync = require('child_process').spawnSync;

var WORKDIR = path.join(__dirname, 'work');
var B2GDIR = path.join(WORKDIR, 'B2G');
var GECKODIR = path.join(WORKDIR, 'mozilla-central');
var GAIADIR = path.join(B2GDIR, 'gaia');

var main = function() {
  function setup(taskId) {
    console.log('setup');

    // TODO: Create bisect log in the task directory.
    execSync('mkdir -p ' + path.join(WORKDIR, taskId.toString()));

    process.chdir(WORKDIR);

    if (!fs.existsSync(B2GDIR)) {
      // Set color.ui false to stop repo init colorization prompt.
      spawnSync('bash',
                ['-c',
                 'git config --global color.ui false; ' +
                 'git clone git://github.com/mozilla-b2g/B2G.git; ' +
                 'cd B2G; ' +
                 './config.sh flame-kk; ' +
                 'echo "GECKO_PATH=' + GECKODIR + '" > .userconfig'],
                { stdio: 'inherit' });
    } else {
      spawnSync('bash', ['-c', 'cd B2G; ./repo sync'], { stdio: 'inherit' });
    }

    if (!fs.existsSync(GECKODIR)) {
      spawnSync('bash',
                ['-c',
                 'hg clone https://hg.mozilla.org/mozilla-central'],
                { stdio: 'inherit' });
    } else {
      spawnSync('bash', ['-c', 'cd mozilla-central; hg pull -u'], { stdio: 'inherit' });
    }

    // Environment variables for the bisect script.
    process.env.BBB_B2GDIR = B2GDIR;
    process.env.BBB_WORKDIR = WORKDIR;
  }

  function checkout(geckoRev, gaiaRev) {
    console.log('checkout ' + geckoRev + ' ' + gaiaRev);
    execSync('hg up -r ' + geckoRev, { cwd: GECKODIR });
    execSync('git checkout ' + gaiaRev, { cwd: GAIADIR });
  }

  function testGood(cmd) {
    console.log('testGood ' + cmd);
    var proc = spawnSync('bash',
                         ['-c',
                          '../scripts/' + cmd],
                         { cwd: WORKDIR, stdio: 'inherit' });
    return !proc.status;
  }

  function bisectGecko(goodRev, badRev, cmd) {
    console.log('bisectGecko ' + goodRev + ' ' + badRev + ' ' + cmd);
    spawnSync('bash',
              ['-c',
               'hg bisect -r; ' +
               'hg bisect -g ' + goodRev + '; ' +
               'hg bisect -b ' + badRev + '; ' +
               'hg bisect -c "../../scripts/' + cmd + ' gecko"'],
              { cwd: GECKODIR, stdio: 'inherit' });
  }

  function bisectGaia(goodRev, badRev, cmd) {
    console.log('bisectGaia ' + goodRev + ' ' + badRev + ' ' + cmd);
    spawnSync('bash',
              ['-c',
               'git bisect reset; ' +
               'git bisect start ' + badRev + ' ' + goodRev + '; ' +
               'git bisect run ../../../scripts/' + cmd + ' gaia'],
              { cwd: GAIADIR, stdio: 'inherit' });
  }

  // TODO: Make a task serial number.
  setup(1);

  var goodGecko = process.argv[2];
  var badGecko = process.argv[3];
  var goodGaia = process.argv[4];
  var badGaia = process.argv[5];

  // The bisect script followed by its arguments.
  var cmd = process.argv.slice(6).join(' ');

  // Figure out it is Gecko or Gaia causes the regression.
  checkout(goodGecko, badGaia);
  if (testGood(cmd)) {
    bisectGecko(goodGecko, badGecko, cmd);
  } else {
    bisectGaia(goodGaia, badGaia, cmd);
  }
}

if (require.main === module) {
  main();
}
