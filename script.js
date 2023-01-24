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
  return $(`input[type=file].${classname}`).prop("files");
}

function updateInput(classname) {
  let input = window.event.srcElement;

  if (input.files.length === 0) {
    $("#inputs").find("." + classname).text("");
    return;
  }

  let file = input.files[0];

  $("#inputs").find("." + classname).text(
    "{0} ({1})".format(file.name, fileSizeFormat(file.size))
  );
}

function updateParts() {
  let music = getUploads("music");

  if (music.length === 0) {
    return;
  }

  music[0].text().then(
    function (musicValue) {
      populateParts($($.parseXML(musicValue)));
    }
  );
}

function populateParts(xml) {
  let dropdown = $("#select-part .dropdown");
  dropdown.empty();

  for (p of Array.from(xml.find("score-part"))) {
    dropdown.append(`<option value="${p.id}">${p.id}</option>`);
  }
}

function selectPart() {
  $("#select-part").removeClass("hidden");
}

function selectStaff() {
  $("#select-staff").removeClass("hidden");
}

function updatePart() {
  $("#inputs .part").text(
    $("#select-part .dropdown").val()
  );
}

function updateStaff() {
  $("#inputs .staff").text(
    $("#select-staff .staff-no").val()
  );
}

function openPopup(message) {
  $("#info .content").html(message);
  $("#info").removeClass("hidden");
}

function closePopup() {
  $(window.event.srcElement).parent().addClass("hidden");
}

function generate() {
  let music = getUploads("music");
  let lyrics = getUploads("lyrics");

  if (music.length === 0 || lyrics.length === 0) {
    openPopup("You must select a music file and a lyrics file.");
    return;
  }

  music[0].text().then(
    function (musicValue) {
      lyrics[0].text().then(
        function (lyricsValue) {
          try {
            let out = addLyrics(musicValue, lyricsValue);
            let name = music[0].name.split(".")[0];
            downloadString(out, `${name}-with-lyrics.musicxml`);
            console.log(out);
          }
          catch (e) {
            openPopup(e.message);
          }
        }
      );
    }
  );
}

function addLyrics(music, lyrics) {
  let xmlDoc = $.parseXML(music);
  let xml = $(xmlDoc);

  let words = lyrics.split(/\s+/);

  const PART = $("#select-part .dropdown").val();
  const STAFF = $("#select-staff .staff-no").val();

  let part = xml.find(`part[id="${PART}"]`);

  if (part.length === 0) {
    throw new Error(`No such part: "${PART}"`);
  }

  part.find("note").each(getNoteHandler(STAFF, getGenerator(words)));

  return new XMLSerializer().serializeToString(xmlDoc);
}

function getNoteHandler(staff, lyricGenerator) {
  return function () {
    let $this = $(this);

    if ($this.children("staff").prop("innerHTML") !== staff) {
      return true; // skip notes in wrong staff
    }

    if ($this.children("rest").length > 0) {
      return true; // don't put lyrics on rests
    }

    if ($this.children("chord").length > 0) {
      return true; // don't put lyrics on secondary notes of chords
    }

    word = lyricGenerator.next();

    if (word.done) {
      return false; // stop if there are no more lyrics
    }

    if (word.value.startsWith("%")) {
      return true; // skip note if word starts with '%'
    }

    if (word.value.startsWith("\\")) {
      word.value = word.value.substring(1);
    }

    let lyricElement = $this.children("lyric").eq(0);

    if (lyricElement.length > 0) {
      lyricElement.children("text").text(word.value);
    }
    else {
      $this.append(
        `<lyric number="1">` +
        `<syllabic>single</syllabic>` +
        `<text>${word.value}</text>` +
        `</lyric>`
      );
    }
  }
}

function* getGenerator(collection) {
  for (let item of collection) {
    yield item;
  }
}

function downloadString(str, name) {
  const HEADER = "data:application/octet-stream;charset=utf-8,";
  let url = HEADER + encodeURIComponent(str);

  let link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
