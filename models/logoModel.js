// models/logoModel.js

function getLogoModel(logo) {
  return {
    type: "logo",
    theme: logo.theme?.toLowerCase(),
    imageUrl: logo.imageUrl,
    source: logo.source // "ai" or "local"
  };
}

export { getLogoModel };
