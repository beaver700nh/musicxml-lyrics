String.prototype.format = function(...args) {
  return this.replace(
    /{(\d+)}/g,
    (match, number) => (
      typeof args[number] === 'undefined' ? match : args[number]
    )
  );
};

function fileSizeFormat(bytes) {
  this.SI_PREFIXES = ["", "K", "M", "G", "T", "P", "E", "Z", "Y", "R", "Q"];

  if (bytes == 0) return "0 B";

  const size = Math.log10(bytes);

  for (let index in this.SI_PREFIXES) {
    const shift = 3 * index;
    if (size < shift + 3) {
      return "{0} {1}B".format(
        roundToDecimals(bytes / 10 ** shift, 1000), this.SI_PREFIXES[index]
      );
    }
  }

  const shift = Math.floor(size);
  const number = roundToDecimals(bytes / 10 ** shift, 1000);
  return "{0}e{1} B".format(number, shift);
}

function roundToDecimals(number, precision) {
  return Math.round((number + Number.EPSILON) * precision) / precision;
}

function triggerUpload(classname) {
  $(`input[type=file].${classname}`).click();
}

function getUploads(classname) {
  return $(`input[type=file].${classname}`).get(0).files;
}

function updateInput(classname) {
  let input = window.event.srcElement;
  let file = input.files[0];

  $(`#inputs`).find("." + classname).text(
    "{0} - {1} ({2})".format(
      file.name, file.type, fileSizeFormat(file.size)
    )
  );
}

function openPopup(message) {
  $("#popup .content").html(message);
  $("#popup").removeClass("hidden");
}

function closePopup() {
  $("#popup").addClass("hidden");
}

function generate() {
  if (this?.inProgress) {
    return;
  }

  this.inProgress = true;

  let music = getUploads("music");
  let lyrics = getUploads("lyrics");

  if (!music[0]?.type.includes("xml")) {
    openPopup(`The music file should be MusicXML, not ${music[0]?.type}.`);
    return;
  }

  if (!lyrics[0]?.type.includes("txt")) {
    openPopup(`The lyrics file should be text, not ${lyrics[0]?.type}.`);
    return;
  }

  music[0].text().then(
    function (musicValue) {
      lyrics[0].text().then(
        function (lyricsValue) {
          generate.inProgress = false;
          let out = addLyrics(musicValue, lyricsValue);
          console.log(out);
        }
      );
    }
  );
}

function addLyrics(music, lyrics) {
  return `---MUSIC---\n${music}\n---LYRICS---\n${lyrics}\n`;
}
