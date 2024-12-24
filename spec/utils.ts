import {sortJsonKeys} from 'sort-json-keys';

export function assert(value: boolean, message: string): asserts value is true {
  if (value !== true) {
    throw new TypeError(`❌ Assert "${message}" fails`);
  }

  testsCount += 1;

  console.log(' ✅', message);
}

type AssertEqualExceptNumbers = (a: object, b: object, message: string) => void;

export const assertEqualExceptNumbers: AssertEqualExceptNumbers = (a, b, message) => {
  // The keys need to be sorted because their order depends on
  // the asynchronous race when reading modules from the file system.
  const aJson = JSON.stringify(sortJsonKeys(a)).replace(/\d+/g, '0');
  const bJson = JSON.stringify(sortJsonKeys(b)).replace(/\d+/g, '0');

  for (let index = 0; index < aJson.length; index += 1) {
    if (aJson[index] !== bJson[index]) {
      assert(
        false,
        `${message}:\n${aJson.slice(index - 50, index + 500)}\n\n${bJson.slice(
          index - 50,
          index + 500,
        )}`,
      );
    }
  }

  assert(true, message);
};

export const ok: (message: string) => void = (message) =>
  console.log(`\x1B[32m[OK]\x1B[39m ${message}`);

export let testsCount = 0;
