export interface ReadableBookContent {
  id: string;
  title: string;
  author: string;
  pages: {
    pageNumber: number;
    chapterTitle: string;
    text: string;
  }[];
}

export const READABLE_BOOKS: Record<string, ReadableBookContent> = {
  'alice_wonderland': {
    id: 'alice_wonderland',
    title: 'Alice in Wonderland',
    author: 'Lewis Carroll',
    pages: [
      {
        pageNumber: 1,
        chapterTitle: 'Chapter I: Down the Rabbit-Hole',
        text: 'Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, "and what is the use of a book," thought Alice "without pictures or conversations?"\n\nSo she was considering in her own mind (as well as she could, for the hot day made her feel very sleepy and stupid), whether the pleasure of making a daisy-chain would be worth the trouble of getting up and picking the daisies, when suddenly a White Rabbit with pink eyes ran close by her.'
      },
      {
        pageNumber: 2,
        chapterTitle: 'Chapter I: Down the Rabbit-Hole',
        text: 'There was nothing so VERY remarkable in that; nor did Alice think it so VERY much out of the way to hear the Rabbit say to itself, "Oh dear! Oh dear! I shall be late!" (when she thought it over afterwards, it occurred to her that she ought to have wondered at this, but at the time it all seemed quite natural);\n\nBut when the Rabbit actually TOOK A WATCH OUT OF ITS WAISTCOAT-POCKET, and looked at it, and then hurried on, Alice started to her feet, for it flashed across her mind that she had never before seen a rabbit with either a waistcoat-pocket, or a watch to take out of it, and burning with curiosity, she ran across the field after it, and fortunately was just in time to see it pop down a large rabbit-hole under the hedge.'
      },
      {
        pageNumber: 3,
        chapterTitle: 'Chapter I: Down the Rabbit-Hole',
        text: 'In another moment down went Alice after it, never once considering how in the world she was to get out again.\n\nThe rabbit-hole went straight on like a tunnel for some way, and then dipped suddenly down, so suddenly that Alice had not a moment to think about stopping herself before she found herself falling down a very deep well.\n\nEither the well was very deep, or she fell very slowly, for she had plenty of time as she went down to look about her and to wonder what was going to happen next. First, she tried to look down and make out what she was coming to, but it was too dark to see anything; then she looked at the sides of the well, and noticed that they were filled with cupboards and book-shelves; here and there she saw maps and pictures hung upon pegs.'
      },
      {
        pageNumber: 4,
        chapterTitle: 'Chapter I: Down the Rabbit-Hole',
        text: 'She took down a jar from one of the shelves as she passed; it was labelled "ORANGE MARMALADE", but to her great disappointment it was empty: she did not like to drop the jar for fear of killing somebody, so managed to put it into one of the cupboards as she fell past it.\n\n"Well!" thought Alice to herself, "after such a fall as this, I shall think nothing of tumbling down stairs! How brave they\'ll all think me at home! Why, I wouldn\'t say anything about it, even if I fell off the top of the house!" (Which was very likely true.)'
      },
      {
        pageNumber: 5,
        chapterTitle: 'Chapter II: The Pool of Tears',
        text: '"Curiouser and curiouser!" cried Alice (she was so much surprised, that for the moment she quite forgot how to speak good English); "now I\'m opening out like the largest telescope that ever was! Good-bye, feet!" (for when she looked down at her feet, they seemed to be almost out of sight, they were getting so far off).\n\n"Oh, my poor little feet, I wonder who will put on your shoes and stockings for you now, dears? I\'m sure I shan\'t be able! I shall be a great deal too far off to trouble myself about you: you must do the best you can."\n\nJust then her head struck against the roof of the hall: in fact she was now more than nine feet high, and she at once took up the little golden key and hurried off to the garden door.'
      }
    ]
  },
  'great_gatsby': {
    id: 'great_gatsby',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    pages: [
      {
        pageNumber: 1,
        chapterTitle: 'Chapter I: The Sound of the Summer',
        text: 'In my younger and more vulnerable years my father gave me some advice that I\'ve been turning over in my mind ever since.\n\n"Whenever you feel like criticizing any one," he told me, "just remember that all the people in this world haven\'t had the advantages that you\'ve had."\n\nHe didn\'t say any more, but we\'ve always been unusually communicative in a reserved way, and I understood that he meant a great deal more than that. In consequence, I\'m inclined to reserve all judgments, a habit that has opened up many curious natures to me and also made me the victim of not a few veteran bores.'
      },
      {
        pageNumber: 2,
        chapterTitle: 'Chapter I: The Sound of the Summer',
        text: 'The abnormal mind is quick to detect and attach itself to this quality when it appears in a normal person, and so it came about that in college I was unjustly accused of being a politician, because I was privy to the secret griefs of wild, unknown men. Most of the confidences were unsought—frequently I have feigned sleep, preoccupation, or a hostile levity when I realized by some unmistakable sign that an intimate revelation was quivering on the horizon;\n\nFor the intimate revelations of young men, or at least the terms in which they express them, are usually plagiaristic and marred by obvious suppressions. Reserving judgments is a matter of infinite hope.'
      },
      {
        pageNumber: 3,
        chapterTitle: 'Chapter I: The Sound of the Summer',
        text: 'And, after boasting this way of my tolerance, I come to the admission that it has a limit. Conduct may be founded on the hard rock or the wet marshes, but after a certain point I don\'t care what it\'s founded on. When I came back from the East last autumn I felt that I wanted the world to be in uniform and at a sort of moral attention forever;\n\nI wanted no more riotous excursions with privileged glimpses into the human heart. Only Gatsby, the man who gives his name to this book, was exempt from my reaction—Gatsby, who represented everything for which I have an unaffected scorn.'
      }
    ]
  },
  'pride_prejudice': {
    id: 'pride_prejudice',
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    pages: [
      {
        pageNumber: 1,
        chapterTitle: 'Chapter I: A Truth Universally Acknowledged',
        text: 'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.\n\nHowever little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered the rightful property of some one or other of their daughters.\n\n"My dear Mr. Bennet," said his lady to him one day, "have you heard that Netherfield Park is let at last?"\n\nMr. Bennet replied that he had not.'
      },
      {
        pageNumber: 2,
        chapterTitle: 'Chapter I: A Truth Universally Acknowledged',
        text: '"But it is," returned she; "for Mrs. Long has just been here, and she told me all about it."\n\nMr. Bennet made no answer.\n\n"Do you not want to know who has taken it?" cried his wife impatiently.\n\n"YOU want to tell me, and I have no objection to hearing it."\n\nThis was invitation enough.'
      },
      {
        pageNumber: 3,
        chapterTitle: 'Chapter I: A Truth Universally Acknowledged',
        text: '"Why, my dear, you must know, Mrs. Long says that Netherfield is taken by a young man of large fortune from the north of England; that he came down on Monday in a chaise and four to see the place, and was so much delighted with it, that he agreed with Mr. Morris immediately; that he is to take possession by Michaelmas, and some of his servants are to be in the house by the end of next week."\n\n"What is his name?"\n\n"Bingley."'
      }
    ]
  },
  'sherlock_holmes': {
    id: 'sherlock_holmes',
    title: 'A Study in Scarlet',
    author: 'Arthur Conan Doyle',
    pages: [
      {
        pageNumber: 1,
        chapterTitle: 'Chapter I: Mr. Sherlock Holmes',
        text: 'In the year 1878 I took my degree of Doctor of Medicine of the University of London, and proceeded to Netley to go through the course prescribed for surgeons in the Army. Having completed my studies there, I was duly attached to the Fifth Northumberland Fusiliers as Assistant Surgeon.\n\nThe regiment was stationed in India at the time, and before I could join it, the second Afghan war had broken out. On landing at Bombay, I found that my corps had already advanced through the passes, and was deep in the enemy\'s country. I followed, however, with many other officers who were in the same situation as myself, and succeeded in reaching Candahar in safety, where I found my regiment, and at once entered upon my new duties.'
      },
      {
        pageNumber: 2,
        chapterTitle: 'Chapter I: Mr. Sherlock Holmes',
        text: 'The campaign brought honours and promotion to many, but for me it had nothing but misfortune and disaster. I was removed from my brigade and attached to the Berkshires, with whom I served at the fatal battle of Maiwand.\n\nThere I was struck on the shoulder by a Jezail bullet, which shattered the bone and grazed the subclavian artery. I should have fallen into the hands of the murderous Ghazis had it not been for the devotion and courage shown by Murray, my orderly, who threw me across a pack-horse, and succeeded in bringing me safely to the British lines.'
      }
    ]
  }
};

export const getDynamicBookContent = (title: string, author: string, pageCount: number = 200): ReadableBookContent => {
  const seedPages = [
    {
      chapterTitle: 'Chapter 1: The Threshold of Discovery',
      text: `Every story begins with a small ripple in the ordinary flow of time. For "${title}", this is the moment where curiosity takes hold. The author, ${author}, paints a rich canvas of thoughts and aspirations, drawing the reader closer into the deep, unwritten pathways of human experience.\n\nAs you hold this page, imagine the soft rustle of leaves or the quiet hum of a coffee shop. Reading is a sanctuary of focus—an antidote to the fast, fragmented screens of the modern world. Take a deep, steady breath. This is your personal space of learning and imagination.`
    },
    {
      chapterTitle: 'Chapter 2: Uncharted Narratives',
      text: `The core of "${title}" delves into questions of existence, action, and identity. Why do we seek the things we seek? ${author} structures this segment to challenge standard assumptions, weaving a pattern of insights that feel both deeply intimate and broadly universal.\n\n"Books are a uniquely portable magic," Stephen King once wrote. As you move through these digital pages, you are actively exercising your focus and building neural pathways that promote long-term memory, emotional intelligence, and calm contemplation. You have read another page. Your streak and focus grow stronger with every line.`
    },
    {
      chapterTitle: 'Chapter 3: The Echo of Wisdom',
      text: `We reach the peak of the discourse. Here, the characters or arguments in "${title}" clash, resolve, and crystallize into lasting truths. The pacing accelerates, leaving room for readers to reflect on how these lessons apply to their own daily habits and goals.\n\nThank you for choosing to invest your time in a book. By logging this reading session in your NovelNest library, you are setting a standard of growth and mindfulness for your future self.`
    }
  ];

  const totalPagesToGenerate = Math.max(3, Math.min(pageCount, 15)); // generate up to 15 interactive pages for simulation
  const generatedPages = [];

  for (let i = 1; i <= totalPagesToGenerate; i++) {
    const seedIndex = (i - 1) % seedPages.length;
    const seed = seedPages[seedIndex];
    generatedPages.push({
      pageNumber: i,
      chapterTitle: `${seed.chapterTitle} (Session Page ${i})`,
      text: seed.text + `\n\n[This page represents page ${i} of the simulated reading experience of ${title}. Every turn of the page logs actual pages to your reading habit tracker, pushing your daily streak further and building your stats!]`
    });
  }

  return {
    id: title.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
    title,
    author,
    pages: generatedPages
  };
};
