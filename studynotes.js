// Mengambil catatan dari Local Storage
let catatan = JSON.parse(localStorage.getItem("catatan")) || [];

// Fungsi menambahkan catatan
function tambahCatatan() {

    let judul = document.getElementById("judul").value;
    let isi = document.getElementById("isi").value;

    if (judul === "" || isi === "") {
        alert("Judul dan isi catatan harus diisi!");
        return;
    }

    catatan.push({
        judul: judul,
        isi: isi
    });

    simpanCatatan();

    document.getElementById("judul").value = "";
    document.getElementById("isi").value = "";

    tampilkanCatatan();
}

// Fungsi menyimpan catatan
function simpanCatatan() {
    localStorage.setItem("catatan", JSON.stringify(catatan));
}

// Fungsi menampilkan catatan
function tampilkanCatatan() {

    let daftar = document.getElementById("daftarCatatan");

    daftar.innerHTML = "";

    catatan.forEach(function(item, index) {

        let card = document.createElement("div");

        card.className = "bg-white/5 border border-white/10 rounded-xl p-4";

        let judul = document.createElement("h3");
        judul.className = "font-bold text-lg";
        judul.textContent = item.judul;

        let isi = document.createElement("p");
        isi.className = "text-white/60 mt-2 whitespace-pre-wrap";
        isi.textContent = item.isi;

        let tombol = document.createElement("button");
        tombol.textContent = "Hapus";
        tombol.className = "text-red-400 mt-3";

        tombol.onclick = function() {
            hapusCatatan(index);
        };

        card.append(judul, isi, tombol);
        daftar.appendChild(card);

    });
}

// Fungsi menghapus catatan
function hapusCatatan(index) {

    catatan.splice(index, 1);

    simpanCatatan();

    tampilkanCatatan();
}

// Menampilkan catatan saat halaman dibuka
tampilkanCatatan();
