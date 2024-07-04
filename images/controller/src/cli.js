import { CLIClient } from "@octopuscentral/controller";
import { cliWarningCode } from "@octopuscentral/types";

console.log('===============================\n OctopusCentral Controller CLI \n===============================');

const cli = new CLIClient();

cli.on('stop', () => process.exit());

cli.on('warning', (code, data) =>
  console.warn('[!]', (code => {
    switch (code) {
      case cliWarningCode.invalid_command:       return 'invalid command';
      case cliWarningCode.empty_response:        return 'empty response';
      case cliWarningCode.unknown_response_code: return `unknown response code: ${data}`;
      case cliWarningCode.response_parse_error:  return 'response parse error';
    }
  })(code))
);

cli.on('resposne', (type, data) => {
  switch (type) {
    case 'value': return console.log(data);
    case 'list': return console.log(data.join(', '));
    case 'table': return console.table(data);
  }
});

cli.start();