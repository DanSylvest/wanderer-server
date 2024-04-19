const print_f = function () {
  let r_str = "";
  let next = arguments[0];

  const rx = /(%[a-zA-Z]{1})/;
  let a = 1;
  let match;

  while ((match = rx.exec(next))) {
    const prev = next.substring(0, match.index);
    const macro = next.substring(match.index + 1, match.index + 2);
    next = next.substring(match.index + 2, next.length);
    r_str += prev;

    const arg = arguments[a];

    if (arg !== undefined) {
      switch (macro) {
        case "s":
          if (arg.toString) r_str += arg.toString();
          break;
        case "b":
          r_str += arg.toString();
          break;
        default:
          r_str += `%${macro}`;
          break;
      }
    } else {
      r_str += `%${macro}`;
    }
    a++;
  }

  r_str += next;

  return r_str;
};

module.exports = print_f;
