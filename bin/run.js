import oclif from "@oclif/core";

oclif
  .run(void 0, import.meta.url)
  .then(oclif.flush)
  .catch(oclif.Errors.handle);

// require("@oclif/command").run().then(require("@oclif/command/flush")).catch(require("@oclif/errors/handle"));
