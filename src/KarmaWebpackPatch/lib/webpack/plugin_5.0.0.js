const KW_Framework = require('../karma-webpack/framework');
const KW_Preprocessor = require('../karma-webpack/preprocessor');

const KW_KarmaPlugin = {
  'preprocessor:webpack': ['factory', KW_Preprocessor],
  'framework:webpack': ['factory', KW_Framework],
};

module.exports = KW_KarmaPlugin;
