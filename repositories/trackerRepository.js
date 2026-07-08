/* repositories/trackerRepository.js — simple repository wrapping the lower-level DB */
(function () {
  function getDB() { return window.DB; }

  async function getMeta(key) { return getDB().getMeta(key); }
  async function setMeta(key, value) { return getDB().setMeta(key, value); }
  async function getDay(day) { return getDB().getDay(day); }
  async function putDay(rec) { return getDB().putDay(rec); }
  async function getAllDays() { return getDB().getAllDays(); }
  async function putPhoto(day, blob) { return getDB().putPhoto(day, blob); }
  async function getPhoto(day) { return getDB().getPhoto(day); }
  async function getAllPhotos() { return getDB().getAllPhotos(); }
  async function clearAll() { return getDB().clearAll(); }

  window.TrackerRepository = {
    getMeta,
    setMeta,
    getDay,
    putDay,
    getAllDays,
    putPhoto,
    getPhoto,
    getAllPhotos,
    clearAll,
  };
})();
