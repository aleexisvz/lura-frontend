export type BookChapter = {
  id: string;
  title: string;
  startPage: number;
};

export type BookPageData = {
  pageNumber: number;
  chapterId: string;
  chapterTitle?: string;
  runningHeaderLeft?: string;
  runningHeaderRight?: string;
  paragraphs: string[];
};

export const DEMO_BOOK = {
  id: "demo-book",
  title: "El Laberinto del Viento",
  author: "Alejandro Sanz",
  totalPages: 254,
  chapters: [
    { id: "cap-1", title: "Capítulo 1: El Eco del Pasado", startPage: 1 },
    { id: "cap-2", title: "Capítulo 2: Los Secretos de la Sombra", startPage: 68 },
    { id: "cap-3", title: "Capítulo 3: El Susurro de las Hojas", startPage: 120 },
    { id: "cap-4", title: "Capítulo 4: Las Ruinas Olvidadas", startPage: 180 },
    { id: "cap-5", title: "Capítulo 5: El Umbral del Viento", startPage: 220 },
  ] as BookChapter[],
};

// Pages 68 and 69 correspond exactly to the spread in the user's mockup
export const DEMO_PAGES: Record<number, BookPageData> = {
  68: {
    pageNumber: 68,
    chapterId: "cap-2",
    chapterTitle: "Capítulo 2: Los Secretos de la Sombra",
    runningHeaderLeft: "EL LABERINTO DEL VIENTO",
    runningHeaderRight: "ALEJANDRO SANZ",
    paragraphs: [
      "Desde las profundidades de la cueva, un eco lejano riontara. anti rantombrio, es un gruza que el senito linedta a obranar los nel tanda daína todementa-- tanido auto mara naz solena derituna levia lem sonte tax lecnimas y tintramentaras sintoras y el cuito de tena maje.",
      "La primanéen temado ante una foresta el simol te larrgo ha hasa rada coseruta el siguio, a pueden se resicitauido. Es se anrbe has una sorrada en podutaño de allo dar cemsteete la qu las taroros",
    ],
  },
  69: {
    pageNumber: 69,
    chapterId: "cap-2",
    runningHeaderLeft: "EL LABERINTO DEL VIENTO",
    runningHeaderRight: "ALEJANDRO SANZ",
    paragraphs: [
      "Una y otra vez, la oscuridad pareci expretimente concera al laano una parecía en ea lugar, lei enaullment purcta sea que la pueden es tur str ponta ano negaran los pinieras, ps conterrnensimente entrato dos an que pa sirnpirie som anista.",
      "Una maseura fez dara una matosta comaton; a que coulha aesera mal considérando lambinr avorado n es encuidad parecía mus. Ha caracte resacenza la portapa, premia espu consez raesova o dirnrainitiante de muy flúmen de empirerz una gafira sesula y máz, ique su alensadra, no",
    ],
  },
  70: {
    pageNumber: 70,
    chapterId: "cap-2",
    runningHeaderLeft: "EL LABERINTO DEL VIENTO",
    runningHeaderRight: "ALEJANDRO SANZ",
    paragraphs: [
      "El rumor del viento entre los desfiladeros cobraba una fuerza inusitada a medida que la noche avanzaba. Las sombras se estiraban como dedos espectrales sobre la fría roca, dibujando senderos olvidados por el tiempo.",
      "Cada paso resonaba con la pesadez de una advertencia que nadie se atrevió a pronunciar. Sin embargo, el impulso por descubrir lo que aguardaba tras el umbral era más fuerte que cualquier temor.",
    ],
  },
  71: {
    pageNumber: 71,
    chapterId: "cap-2",
    runningHeaderLeft: "EL LABERINTO DEL VIENTO",
    runningHeaderRight: "ALEJANDRO SANZ",
    paragraphs: [
      "La luz de la lámpara parpadeó dos veces antes de extinguirse, dejando únicamente el resplandor plateado de la luna filtrándose a través de las grietas de la bóveda natural.",
      "Fue en ese instante de silencio absoluto cuando se escuchó la primera nota: un acorde suave, casi imperceptible, flotando en el aire como si el propio viento estuviese cantando.",
    ],
  },
  1: {
    pageNumber: 1,
    chapterId: "cap-1",
    chapterTitle: "Capítulo 1: El Eco del Pasado",
    runningHeaderLeft: "EL LABERINTO DEL VIENTO",
    runningHeaderRight: "ALEJANDRO SANZ",
    paragraphs: [
      "Había comenzado mucho antes de que las crónicas registraran los primeros signos del cambio. En la meseta más alta del valle, donde el aire era tan limpio que cortaba la respiración, los viejos guardianes observaban el horizonte con creciente inquietud.",
      "Nadie sabía con certeza de dónde provenía la extraña vibración que hacía temblar las campanas de bronce al amanecer.",
    ],
  },
  2: {
    pageNumber: 2,
    chapterId: "cap-1",
    runningHeaderLeft: "EL LABERINTO DEL VIENTO",
    runningHeaderRight: "ALEJANDRO SANZ",
    paragraphs: [
      "Los mapas antiguos no señalaban ninguna senda más allá del acantilado norte, pero los rumores persistían entre los viajeros que descendían de la cordillera.",
      "Decían que quien se adentrara en el laberinto guiado únicamente por el sonido del viento encontraría respuestas a preguntas que aún no había formulado.",
    ],
  },
};

export function getBookPage(pageNumber: number, title?: string, author?: string): BookPageData {
  if (DEMO_PAGES[pageNumber]) {
    const page = DEMO_PAGES[pageNumber];
    return {
      ...page,
      runningHeaderLeft: title || page.runningHeaderLeft || DEMO_BOOK.title,
      runningHeaderRight: author || page.runningHeaderRight || DEMO_BOOK.author,
    };
  }

  const chapter = [...DEMO_BOOK.chapters].reverse().find((c) => pageNumber >= c.startPage) ?? DEMO_BOOK.chapters[0];
  const isChapterStart = pageNumber === chapter.startPage;

  return {
    pageNumber,
    chapterId: chapter.id,
    chapterTitle: isChapterStart ? chapter.title : undefined,
    runningHeaderLeft: title || DEMO_BOOK.title,
    runningHeaderRight: author || DEMO_BOOK.author,
    paragraphs: [
      `El camino se estrechaba entre murallas de piedra caliza esculpidas por siglos de corrientes invisibles. Cada ráfaga traía consigo fragmentos de historias pasadas y promesas de destinos aún por cumplirse.`,
      `Observando el horizonte desde este punto del sendero, se vislumbraban las siluetas lejanas de las antiguas torres de vigilancia. La luz dorada del atardecer teñía el valle de tonos cobrizos mientras el viaje continuaba con paso firme.`,
    ],
  };
}
