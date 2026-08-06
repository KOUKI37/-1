module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // .sql ファイルの中身を文字列として import できるようにする（Drizzle のマイグレーション読み込み用）
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
