import heroBg from "@/assets/hero-bg.png";
import aotImg from "@/assets/aot.png";
import demonSlayerImg from "@/assets/demon-slayer.png";
import onePieceImg from "@/assets/one-piece.png";
import jujutsuKaisenImg from "@/assets/jujutsu-kaisen.png";
import mhaImg from "@/assets/mha.png";
import narutoImg from "@/assets/naruto.png";
import deathNoteImg from "@/assets/death-note.png";
import fmaImg from "@/assets/fma.png";
import chainsawManImg from "@/assets/chainsaw-man.png";
import { Anime } from "@/components/anime-card";

export const TRENDING_ANIME: Anime[] = [
  { id: "aot", title: "Attack on Titan", image: aotImg, episodes: 87, rating: 9.8, genres: ["Action", "Drama", "Fantasy"] },
  { id: "demon-slayer", title: "Demon Slayer", image: demonSlayerImg, episodes: 55, rating: 9.5, genres: ["Action", "Fantasy", "Historical"] },
  { id: "one-piece", title: "One Piece", image: onePieceImg, episodes: 1092, rating: 9.7, genres: ["Action", "Adventure", "Comedy"] },
  { id: "jujutsu-kaisen", title: "Jujutsu Kaisen", image: jujutsuKaisenImg, episodes: 47, rating: 9.6, genres: ["Action", "Supernatural"] },
  { id: "mha", title: "My Hero Academia", image: mhaImg, episodes: 138, rating: 8.9, genres: ["Action", "Sci-Fi"] },
  { id: "naruto", title: "Naruto Shippuden", image: narutoImg, episodes: 500, rating: 9.4, genres: ["Action", "Adventure", "Fantasy"] },
  { id: "death-note", title: "Death Note", image: deathNoteImg, episodes: 37, rating: 9.9, genres: ["Thriller", "Mystery", "Supernatural"] },
  { id: "fma", title: "Fullmetal Alchemist", image: fmaImg, episodes: 64, rating: 9.8, genres: ["Action", "Adventure", "Drama"] },
];

export const NEW_RELEASES: Anime[] = [
  { id: "chainsaw-man", title: "Chainsaw Man", image: chainsawManImg, episodes: 12, rating: 9.3, genres: ["Action", "Horror"], isNew: true, releaseDate: "Oct 2022" },
  { id: "spy-x-family", title: "Spy x Family", image: aotImg, episodes: 25, rating: 9.1, genres: ["Comedy", "Action"], isNew: true, releaseDate: "Apr 2022" }, // reusing aotImg as fallback
  { id: "vinland-saga", title: "Vinland Saga Season 2", image: demonSlayerImg, episodes: 24, rating: 9.4, genres: ["Action", "Adventure", "Drama"], isNew: true, releaseDate: "Jan 2023" },
  { id: "bleach", title: "Bleach: TYBW", image: onePieceImg, episodes: 26, rating: 9.5, genres: ["Action", "Fantasy"], isNew: true, releaseDate: "Oct 2022" },
  { id: "hxh", title: "Hunter x Hunter", image: jujutsuKaisenImg, episodes: 148, rating: 9.7, genres: ["Action", "Adventure", "Fantasy"], isNew: true, releaseDate: "Classic" },
  { id: "tokyo-ghoul", title: "Tokyo Ghoul", image: mhaImg, episodes: 12, rating: 8.5, genres: ["Action", "Horror", "Drama"], isNew: true, releaseDate: "Classic" },
  { id: "sao", title: "Sword Art Online", image: narutoImg, episodes: 25, rating: 8.0, genres: ["Action", "Sci-Fi", "Romance"], isNew: true, releaseDate: "Classic" },
  { id: "rezero", title: "Re:Zero", image: deathNoteImg, episodes: 50, rating: 8.9, genres: ["Drama", "Fantasy", "Thriller"], isNew: true, releaseDate: "Classic" },
];

export const CATEGORIES = [
  "Action", "Romance", "Fantasy", "Sci-Fi", "Horror", 
  "Comedy", "Drama", "Sports", "Slice of Life", "Thriller"
];
