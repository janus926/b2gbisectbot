#b2gbisectbot

Still under prototyping, it lacks error checking and only bisect by the result of Raptor coldlaunch test.

#Run

```$ node index.js <good gecko> <bad gecko> <good gaia> <bad gaia> raptor.sh <app> <bad metric>```

Example:

```$ node index.js 9f51d691afde ae71eab98a3e e0088a67f53d48f7 e4b63559eba36489 raptor.sh communications/contacts 1134.000```

Now the script raptor.sh determine it is good if the test result is less than 95% of bad metric, otherwise bad. Note this calculation is subject to change.
