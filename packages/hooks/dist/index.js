function useAsync$1() {
  console.log("inside useAsync");
  return [1, 2];
}

var index = {
  useAsync: useAsync
};

exports.default = index;
exports.useAsync = useAsync$1;
//# sourceMappingURL=index.js.map
