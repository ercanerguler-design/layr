/**
 * LAYR - Zengin Demo Seed
 * Istanbul, Ankara, Izmir icin gercekci veriler
 */
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding LAYR zengin veri...");
  const hash = await bcrypt.hash("layr1234!", 12);

  // Kullanicilar
  const demo = await prisma.user.upsert({
    where: { email: "demo@layr.app" },
    update: {},
    create: {
      email: "demo@layr.app",
      username: "layr_demo",
      displayName: "LAYR Demo",
      passwordHash: hash,
      isVerified: true,
      role: "ADMIN",
      interestTags: JSON.stringify(["tarih", "mimari", "kultur"]),
    },
  });
  const ali = await prisma.user.upsert({
    where: { email: "ali@example.com" },
    update: {},
    create: {
      email: "ali@example.com",
      username: "aliyildiz",
      displayName: "Ali Yildiz",
      passwordHash: hash,
      bio: "Tarih meraklisi",
      interestTags: JSON.stringify(["tarih", "osmanli"]),
    },
  });
  const ayse = await prisma.user.upsert({
    where: { email: "ayse@example.com" },
    update: {},
    create: {
      email: "ayse@example.com",
      username: "aysekoc",
      displayName: "Ayse Koc",
      passwordHash: hash,
      bio: "Fotograf sanatcisi",
      interestTags: JSON.stringify(["fotograf", "sanat", "seyahat"]),
    },
  });
  const mehmet = await prisma.user.upsert({
    where: { email: "mehmet@example.com" },
    update: {},
    create: {
      email: "mehmet@example.com",
      username: "mehmetdemir",
      displayName: "Mehmet Demir",
      passwordHash: hash,
      bio: "Dag sevdalisi",
      interestTags: JSON.stringify(["doga", "spor", "gezi"]),
    },
  });

  // Lokasyonlar
  const locationDefs = [
    {
      name: "Galata Kulesi",
      lat: 41.0257,
      lng: 28.9742,
      city: "Istanbul",
      placeId: "galata-kulesi-001",
      category: "LANDMARK",
    },
    {
      name: "Topkapi Sarayi",
      lat: 41.0115,
      lng: 28.9833,
      city: "Istanbul",
      placeId: "topkapi-sarayi-001",
      category: "MUSEUM",
    },
    {
      name: "Sultanahmet Meydani",
      lat: 41.0054,
      lng: 28.9768,
      city: "Istanbul",
      placeId: "sultanahmet-001",
      category: "LANDMARK",
    },
    {
      name: "Kapali Carsi",
      lat: 41.0108,
      lng: 28.968,
      city: "Istanbul",
      placeId: "kapali-carsi-001",
      category: "MARKET",
    },
    {
      name: "Taksim Meydani",
      lat: 41.0369,
      lng: 28.985,
      city: "Istanbul",
      placeId: "taksim-001",
      category: "LANDMARK",
    },
    {
      name: "Besiktas Iskele",
      lat: 41.043,
      lng: 29.0058,
      city: "Istanbul",
      placeId: "besiktas-iskele-001",
      category: "TRANSPORT",
    },
    {
      name: "Kadikoy Carsi",
      lat: 40.9905,
      lng: 29.0245,
      city: "Istanbul",
      placeId: "kadikoy-carsi-001",
      category: "MARKET",
    },
    {
      name: "Anitkabir",
      lat: 39.9252,
      lng: 32.8358,
      city: "Ankara",
      placeId: "anitkabir-001",
      category: "LANDMARK",
    },
    {
      name: "Kizilay Meydani",
      lat: 39.9208,
      lng: 32.8541,
      city: "Ankara",
      placeId: "kizilay-001",
      category: "LANDMARK",
    },
    {
      name: "Konak Pier",
      lat: 38.4189,
      lng: 27.1287,
      city: "Izmir",
      placeId: "konak-pier-001",
      category: "LANDMARK",
    },
  ];

  const locationMap: Record<string, { id: string }> = {};
  for (const l of locationDefs) {
    locationMap[l.placeId] = await prisma.location.upsert({
      where: { placeId: l.placeId },
      update: {},
      create: {
        name: l.name,
        lat: l.lat,
        lng: l.lng,
        city: l.city,
        country: "Turkiye",
        placeId: l.placeId,
        category: l.category,
        isVerified: true,
      },
    });
  }

  // Tum layerlari temizle ve yeniden olustur
  await prisma.layer.deleteMany({});

  const layerDefs = [
    // Galata Kulesi
    {
      userId: demo.id,
      placeId: "galata-kulesi-001",
      title: "1348 - Cenevizliler Insaa Etti",
      content:
        "1348 yilinda Cenevizliler tarafindan insaa edilen Galata Kulesi, Istanbul siluestinin vazgecilmez parcasidir. O donemde Christea Turris (Isa Kulesi) olarak bilinirdi. 67 metre yuksekligi ile Ortacag Galata sehrine hakim olan bu kule, denizden gelen tehditlere karsi nobet noktasi islevini gormustir.",
      type: "HISTORICAL",
      year: 1348,
      tags: ["tarih", "ceneviz", "mimari"],
    },
    {
      userId: ali.id,
      placeId: "galata-kulesi-001",
      title: "Evlenme Teklifim",
      content:
        "2023 yazinda burada sevgilime evlenme teklifi ettim. Kulenin tepesinde gun batimini izlerken yuzugu cikardim. Ellerinin titremesini hissettim, gozleri doldu. Evet dedi! Hayatimin en guzel ani bu terasta gecti.",
      type: "MEMORY",
      tags: ["ask", "ani", "evlenme-teklifi"],
    },
    {
      userId: ayse.id,
      placeId: "galata-kulesi-001",
      title: "Fotograf Rehberi",
      content:
        "360 derece terastan cektigim fotograflar Instagram da 50k begen aldi. Altin saat isigi icin sabah 7 veya aksam 18de gidin. Kalabalik icin hafta ici sabah erken gidin. Biletleri online alin, kuyruk 2 saat surebiliyor.",
      type: "REVIEW",
      tags: ["fotograf", "manzara", "tavsiye"],
    },
    {
      userId: mehmet.id,
      placeId: "galata-kulesi-001",
      content:
        "Babam beni 5 yasimda buraya ilk kez getirmisti. Simdi kendi cocugumu getiriyorum. Kendisi ile ayni noktada ayni pozu verdirdim. Nesiller boyu Istanbul sevgisi aktarilıyor.",
      type: "MEMORY",
      tags: ["aile", "nostalji", "nesiller"],
    },
    {
      userId: demo.id,
      placeId: "galata-kulesi-001",
      title: "1900 - Eski Galata",
      content:
        "1900lu yillarda Galata Kulesi ve cevresi ahsap Rum, Ermeni ve Yahudi evleriyle kapliydi. Kulenin etegi bugunkunden cok daha canli bir kozmopolit mahalleydi. Bu tarihin izleri hala Galata sokaklarinda surdurulebilir.",
      type: "HISTORICAL",
      year: 1900,
      tags: ["tarih", "eski-istanbul", "kozmopolit"],
    },
    // Topkapi Sarayi
    {
      userId: demo.id,
      placeId: "topkapi-sarayi-001",
      title: "Osmanli'nin Kalbi - 1453",
      content:
        "15. yuzyildan 19. yuzyila kadar Osmanli Imparatorlugunu yoneten Topkapi Sarayi, 400 yil boyunca sultanlara ev sahipligi yapti. Bu cinar yaklasik 4000 kisiyi barindiracak kapasitedeydi. 1924 yilinda Ataturk'un talimatiyla muzee donusturuldu.",
      type: "HISTORICAL",
      year: 1453,
      tags: ["osmanli", "tarih", "saray"],
    },
    {
      userId: ayse.id,
      placeId: "topkapi-sarayi-001",
      title: "Harem Odalari",
      content:
        "Harem bolumundeki cicekli cerceveli pencereler ve altin yaldizli tavanlar insani 500 yil oncesine gonderiyor. Her oda baska bir sultanin yasam izlerini tasiyor. Mutlaka gorun.",
      type: "REVIEW",
      tags: ["mimari", "harem", "muze"],
    },
    {
      userId: ali.id,
      placeId: "topkapi-sarayi-001",
      content:
        "Dikkat: Sarayin ana girisi Sultanahmet tarafinda degil, Gulhane Parki ile sarayarasindaki kapidan. Haritalar yanlis gosteriyor. Dogru kapidan girince zaman kazanirsiniz.",
      type: "REVIEW",
      tags: ["tavsiye", "giris", "ulasim"],
    },
    {
      userId: mehmet.id,
      placeId: "topkapi-sarayi-001",
      title: "Dedemin Gorev Yaptigi Yer",
      content:
        "Dedem burada yarbay olarak gorev yapti. Her yil ailem birlikte gelir, onun fotografini cektigimiz yerde fotograf cekeriz. Bu yil onsuz geldik. Cok huzun verdi.",
      type: "MEMORY",
      tags: ["aile", "hatira", "vefat"],
    },
    // Sultanahmet
    {
      userId: demo.id,
      placeId: "sultanahmet-001",
      title: "Hipodrom - Bizans'in At Yarisi",
      content:
        "Bu meydan, Bizans doneminin at yarisi pistinin (Hippodrome) uzerinde kurulmustur. 330 yilinda Konstantin tarafindan yaptirilan Hipodrom, 100.000 seyirciye ev sahipligi yapardi. Dikilitaslar ve Yilanli Sutun hala ayakta.",
      type: "HISTORICAL",
      year: 330,
      tags: ["bizans", "tarih", "hipodrom"],
    },
    {
      userId: ayse.id,
      placeId: "sultanahmet-001",
      title: "Alman Cesmesi - 1898",
      content:
        "Meydanin kuzeyindeki bu muhtes em cesme 1898 yilinda Alman Imparatoru II. Wilhelm'in Istanbul ziyareti anisina yapildi. Bizans mozaiklerine benzer altin yaldizli ic kusagini gorme firsat Bulunmus ise kacirmayin.",
      type: "HISTORICAL",
      year: 1898,
      tags: ["cesme", "alman", "tarihi"],
    },
    {
      userId: mehmet.id,
      placeId: "sultanahmet-001",
      content:
        "Yaz aksamlari burada oturup Sultanahmet Cami'nin usulden yanan isiklar altindaki siluetini izlemek... Dunyanin hic bir yerinde bu hissi alamazsiniz. Istanbul'un en guzel anlarindan biri.",
      type: "MEMORY",
      tags: ["gece", "cami", "istanbul"],
    },
    // Kapali Carsi
    {
      userId: demo.id,
      placeId: "kapali-carsi-001",
      title: "1461 - Dunyanin En Eski AVM'si",
      content:
        "1461 yilinda Fatih Sultan Mehmet tarafindan insaa ettirilen Kapali Carsi, dunyanin en eski ve en buyuk kapali ticaret merkezlerinden biridir. 61 kapisi, 4000 dukkan ve 25.000 calisaniyla bugun de hayatini surduruyor.",
      type: "HISTORICAL",
      year: 1461,
      tags: ["tarih", "fatih", "carsi"],
    },
    {
      userId: ayse.id,
      placeId: "kapali-carsi-001",
      content:
        "Carsi'nin ic sokaginda annemin 40 yillik bildigi kuyumcu hala burada. Sahte altin satmiyor. Tezgahtar sizi baskasina yonlendirirse gitmeyin.",
      type: "REVIEW",
      tags: ["kuyumcu", "guvenilir", "tavsiye"],
    },
    {
      userId: ali.id,
      placeId: "kapali-carsi-001",
      content:
        "Baharat Carsisi'nda Musa Dag'in safran dukkanina gidin. Sahibi 80 yasinda, her baharata dair muhtesem hikayeleri var. Tur istemeden sadece sohbet edin.",
      type: "REVIEW",
      tags: ["baharat", "hikaye", "satici"],
    },
    // Taksim
    {
      userId: demo.id,
      placeId: "taksim-001",
      title: "1928 - Cumhuriyet Aniti",
      content:
        "Taksim Cumhuriyet Aniti, Kurtulus Savasi'nin zaferini ve Cumhuriyet'in kurulusunu simgeliyor. 1928'de Italyan heykeltiras Pietro Canonica tarafindan yapilmistir. Her yil 29 Ekim'de Cumhuriyet kutlamalarinin merkezi olur.",
      type: "HISTORICAL",
      year: 1928,
      tags: ["ataturk", "cumhuriyet", "anit"],
    },
    {
      userId: ayse.id,
      placeId: "taksim-001",
      content:
        "Istiklal Caddesi'nde her adimda farkli bir muzisyen var. Italyan akordeoncu her Cuma aksamustu orada. Caldiginda tum kalabalik etrafinda toplanıyor.",
      type: "REVIEW",
      tags: ["muzik", "istiklal", "sokak-muzisyeni"],
    },
    {
      userId: mehmet.id,
      placeId: "taksim-001",
      content:
        "Nostalji tramvayi Taksim'den Tunnel'e kadar gidiyor. Cocuklugumdan beri ayni tramvay hattinda. Son model telefon tutan insanlarin ortasinda 100 yillik tramvay. Bu Istanbul.",
      type: "MEMORY",
      tags: ["tramvay", "nostalji", "istanbul"],
    },
    // Besiktas
    {
      userId: ali.id,
      placeId: "besiktas-iskele-001",
      title: "Barbaros Hayrettin Pasa",
      content:
        "Iskele meydanindaki Barbaros Hayrettin Pasa heykeli, 16. yuzyilin efsanevi Osmanli amiralini anmaktadir. Cezayir doganı, Akdeniz'in hakimi oldu. Turk denizciliginin simgesi.",
      type: "HISTORICAL",
      year: 1944,
      tags: ["barbaros", "denizcilik", "heykel"],
    },
    {
      userId: ayse.id,
      placeId: "besiktas-iskele-001",
      content:
        "Sabah 7'de vapur ile Kadikoy'den Besiktas'a gecis... Bogazda sisle kaplanmis Istanbul ve martı sesi. Bu sehrin insani olmanin en guzel hislerinden biri.",
      type: "MEMORY",
      tags: ["vapur", "bogaz", "sabah"],
    },
    // Kadikoy
    {
      userId: mehmet.id,
      placeId: "kadikoy-carsi-001",
      title: "En Taze Balik Nerede",
      content:
        "Kadikoy Balik Pazari'nda Kazanci Yokusu'ndaki tezgahlari deneyin. Sahibinden sordugum baligi duymasi bile taptaze. Sabah 6'da gelirseniz aksam saticinin kalmasini beklemek zorunda kalmazsiniz.",
      type: "REVIEW",
      tags: ["balik", "pazar", "taze"],
    },
    {
      userId: ali.id,
      placeId: "kadikoy-carsi-001",
      content:
        "Caferaga Mahallesi'ndeki eski Rum evi cok guzeldi. 2019'da yiktılar. Yerine cam beton bina yaptılar. Fotografını hala duruyur elimde. Her gecen bunu hatirlıyorum.",
      type: "MEMORY",
      year: 2019,
      tags: ["rum-evi", "yikim", "nostalji", "kayip"],
    },
    // Anitkabir
    {
      userId: demo.id,
      placeId: "anitkabir-001",
      title: "10 Kasim 1938",
      content:
        "Mustafa Kemal Ataturk, 10 Kasim 1938'de Dolmabahce Sarayi'nda hayatini kaybetti. Naasi once gecici olarak Ankara'daki Etnografya Muzesi'ne tasindi. 1953'te tamamlanan Anitkabir'e nakledildi.",
      type: "HISTORICAL",
      year: 1938,
      tags: ["ataturk", "tarih", "cumhuriyet"],
    },
    {
      userId: mehmet.id,
      placeId: "anitkabir-001",
      content:
        "Dedem Koreli gazi, her yil 10 Kasim'da beni de yanina alip buraya gelirdi. Onu kaybedeli 3 yil oldu. Bugun yalniz geldim, ikimiz icin dua ettim.",
      type: "MEMORY",
      tags: ["gazi", "dua", "hatira", "vefat"],
    },
    {
      userId: ali.id,
      placeId: "anitkabir-001",
      content:
        "Misak-i Milli Kulesi'nin nobet tutucularinin sessizligi insani derinden etkiliyor. Saygi bu kadar sessiz de ifade edilebilirmiş.",
      type: "REVIEW",
      tags: ["saygi", "sessizlik", "etkileyici"],
    },
    // Kizilay
    {
      userId: demo.id,
      placeId: "kizilay-001",
      content:
        "1950'lerde tum Ankara bu meydana sıgıyordu. Simdi metro hatlari uzandı, merkezin merkezini bulmak zorlastu. Ama hala sehrin kalp atısı burada.",
      type: "HISTORICAL",
      year: 1950,
      tags: ["ankara", "kent", "tarih"],
    },
    // Izmir
    {
      userId: demo.id,
      placeId: "konak-pier-001",
      title: "1901 - Konak Saat Kulesi",
      content:
        "1901 yilinda II. Abdulhamit'in tahta cikisinin 25. yildonumu icin yapilan saat kulesi, Izmir'in tartismasiz simgesidir. Mimarisi Fransiz ekolunden etkilenmiş olan kuleyi mimar Raymond Charles Pere tasarlamistir.",
      type: "HISTORICAL",
      year: 1901,
      tags: ["izmir", "saat-kulesi", "tarih"],
    },
    {
      userId: ayse.id,
      placeId: "konak-pier-001",
      content:
        "Gece Kordon boyunca yurumek, denizin kokusunu almak, arkadaslarla gece sohbeti... Izmir'i anlatmak yetersiz kalir. Gidip yasanmali.",
      type: "MEMORY",
      tags: ["izmir", "kordon", "deniz"],
    },
  ];

  let count = 0;
  for (const l of layerDefs) {
    const loc = locationMap[l.placeId];
    if (!loc) continue;
    await prisma.layer.create({
      data: {
        userId: l.userId,
        locationId: loc.id,
        title: l.title,
        content: l.content,
        type: l.type ?? "TEXT",
        year: l.year,
        isPublic: true,
        tags: JSON.stringify(l.tags ?? []),
        language: "tr",
      },
    });
    count++;
  }

  // AI Ozetler
  const galata = locationMap["galata-kulesi-001"];
  const anitkabir = locationMap["anitkabir-001"];

  if (galata) {
    await prisma.aiSummary.upsert({
      where: { locationId: galata.id },
      update: {},
      create: {
        locationId: galata.id,
        summary:
          "1348'de Cenevizliler tarafindan insaa edilen Galata Kulesi, yuzyillar boyu Istanbul'u izledi. Burada evlenme teklifleri edildi, fotograflar cekdi, aileler nesiller boyu ayni noktada bulbustu.",
        highlights: JSON.stringify([
          "1348 Ceneviz yapisi - 670+ yillik",
          "Evlenme teklifi yapilan romantik nokta",
          "Instagram'da en cok paylasilan Istanbul manzarasi",
        ]),
        sentiment: "nostalgic",
        languages: JSON.stringify(["tr"]),
        layerCount: 5,
      },
    });
  }

  if (anitkabir) {
    await prisma.aiSummary.upsert({
      where: { locationId: anitkabir.id },
      update: {},
      create: {
        locationId: anitkabir.id,
        summary:
          "Anitkabir, sadece bir anit degil, kolektif bir aninin mekanıdır. Gazilerin, orencilerin ve ailelerin katmanlastirdigi duygu yogunlugu burayi benzersiz kilar.",
        highlights: JSON.stringify([
          "Gazilerin ve torunlarinin hikayelerini barindirir",
          "Her 10 Kasim binlerce kisinin bulusma noktasi",
          "Sessizligi ve saygisi ile essiz bir atmosfer",
        ]),
        sentiment: "inspiring",
        languages: JSON.stringify(["tr"]),
        layerCount: 3,
      },
    });
  }

  console.log("Seed tamamlandi!");
  console.log("Lokasyon:", await prisma.location.count());
  console.log("Layer:", await prisma.layer.count());
  console.log("Kullanici:", await prisma.user.count());
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
