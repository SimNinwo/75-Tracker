/* trackerRepository.js — simple repository wrapping the lower-level DB
   Provides a clearer boundary for data access and makes it easier to swap
   storage implementations in future refactors.
*/
(function () {
  const DB = window.DB;

  async function getMeta(key) { return DB.getMeta(key); }
  async function setMeta(key, value) { return DB.setMeta(key, value); }
  async function getDay(day) { return DB.getDay(day); }
  async function putDay(rec) { return DB.putDay(rec); }
  async function getAllDays() { return DB.getAllDays(); }
  async function putPhoto(day, blob) { return DB.putPhoto(day, blob); }
  async function getPhoto(day) { return DB.getPhoto(day); }
  async function getAllPhotos() { return DB.getAllPhotos(); }
  async function clearAll() { return DB.clearAll(); }

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
