module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // IMPORTANT: Do NOT enable React Compiler here.
      // If you previously added "babel-plugin-react-compiler", remove it.
    ],
  };
};