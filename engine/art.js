// Built-in artwork. Pixel sprites are 16x16 grids ('.' = empty, other characters index the
// palette). Line icons are 24x24 SVG path fragments drawn with currentColor.
// All original artwork, MIT licensed with the rest of StoryQuest.
(function (root) {
  const ART = {
 "pixel": {
  "grass": {
   "palette": {
    "g": "#6a9c30",
    "G": "#83b93c",
    "k": "#5b8a26",
    "d": "#8b6644",
    "D": "#6f4f36"
   },
   "rows": [
    "gGgkgGggGkggGgGk",
    "GggGgkgGgggGgGgg",
    "kGgggGgkgGgGgggG",
    "dGddgddGdddgdddG",
    "ddDdddddddDddddd",
    "dddddDdddddddDdd",
    "dDdddddddddddddd",
    "ddddDddddDdddddd",
    "dddddddDdddddddd",
    "dDddddddddddDddd",
    "ddddDdddddddddDd",
    "dddddddDdddddddd",
    "ddDddddddddDdddd",
    "dddddDdddddddddd",
    "dddddddddDdddddd",
    "ddDdddddddddddDd"
   ]
  },
  "diamond": {
   "palette": {
    "c": "#1d6f6a",
    "C": "#3ad3ca",
    "w": "#b6f7f1"
   },
   "rows": [
    "................",
    "................",
    ".....cccccc.....",
    "....cwwwwwwc....",
    "...cwCCCCCCwc...",
    "..cwCCCCCCCCwc..",
    "..cwCCwwCCCCwc..",
    "..cwCCwwCCCCwc..",
    "..cwCCCCCCCCwc..",
    "...cwCCCCCCwc...",
    "....cwCCCCwc....",
    ".....cwCCwc.....",
    "......cwwc......",
    ".......cc.......",
    "................",
    "................"
   ]
  },
  "torch": {
   "palette": {
    "f": "#ffd24a",
    "o": "#ff8f1f",
    "w": "#fff6c2",
    "s": "#8b6644",
    "S": "#6f4f36"
   },
   "rows": [
    "................",
    ".......ff.......",
    "......ffff......",
    "......fwwf......",
    ".......ff.......",
    "......oooo......",
    ".....oowwoo.....",
    ".....oowwoo.....",
    "......oooo......",
    ".......sS.......",
    ".......sS.......",
    ".......sS.......",
    ".......sS.......",
    ".......sS.......",
    ".......sS.......",
    "................"
   ]
  },
  "apple": {
   "palette": {
    "r": "#d1402c",
    "R": "#ff8a72",
    "l": "#4f9c2f",
    "s": "#6b4a2f"
   },
   "rows": [
    "................",
    ".......ss.......",
    "......ss........",
    "....lllss.......",
    "...lllll........",
    "..rrrrrrrrr.....",
    ".rrrrrrrrrrr....",
    ".rRrrrrrrrrrr...",
    ".rRrrrrrrrrrr...",
    ".rrrrrrrrrrrr...",
    ".rrrrrrrrrrrr...",
    "..rrrrrrrrrr....",
    "..rrrrrrrrrr....",
    "...rrrrrrrr.....",
    ".....rrrr.......",
    "................"
   ]
  },
  "pick": {
   "palette": {
    "i": "#7d7d7d",
    "I": "#cdcdcd",
    "s": "#8b6644",
    "S": "#6f4f36"
   },
   "rows": [
    "................",
    "..iii......iii..",
    ".iIIIiiiiiIIIi..",
    ".iIIIIIIIIIIIi..",
    "..iiiiisSiiiii..",
    ".......sS.......",
    "......sS........",
    "......sS........",
    ".....sS.........",
    ".....sS.........",
    "....sS..........",
    "....sS..........",
    "...sS...........",
    "...sS...........",
    "................",
    "................"
   ]
  },
  "heart": {
   "palette": {
    "h": "#8b1a1a",
    "H": "#e33d3d",
    "w": "#ff9a9a"
   },
   "rows": [
    "................",
    "................",
    "..hh......hh....",
    ".hwwh....hHHh...",
    "hwwHHh..hHHHHh..",
    "hwHHHHhhHHHHHh..",
    "hHHHHHHHHHHHHh..",
    "hHHHHHHHHHHHHh..",
    ".hHHHHHHHHHHh...",
    "..hHHHHHHHHh....",
    "...hHHHHHHh.....",
    "....hHHHHh......",
    ".....hHHh.......",
    "......hh........",
    "................",
    "................"
   ]
  },
  "bread": {
   "palette": {
    "b": "#a86b32",
    "B": "#d29a52",
    "w": "#f0cd8e"
   },
   "rows": [
    "................",
    "................",
    "...bbbbbbbbb....",
    "..bBBBBBBBBBb...",
    ".bBwwBBwwBBwBb..",
    ".bBBBBBBBBBBBb..",
    ".bBBwwBBwwBBBb..",
    ".bBBBBBBBBBBBb..",
    ".bBBBBwwBBwwBb..",
    ".bBBBBBBBBBBBb..",
    "..bBBBBBBBBBb...",
    "...bbbbbbbbb....",
    "................",
    "................",
    "................",
    "................"
   ]
  },
  "chest": {
   "palette": {
    "c": "#5b4326",
    "C": "#8a6434",
    "w": "#b08a4e",
    "k": "#3a2a17",
    "m": "#c9c9c9"
   },
   "rows": [
    "................",
    "..cccccccccccc..",
    ".cCCCCCCCCCCCCc.",
    ".cCwwCCCCCCwwCc.",
    ".cCCCCCmmCCCCCc.",
    ".cccccmmmmccccc.",
    ".cCCCCmmmmCCCCc.",
    ".cCwwCCmmCCwwCc.",
    ".cCCCCCCCCCCCCc.",
    ".cCCCCCCCCCCCCc.",
    ".cCwwCCCCCCwwCc.",
    ".cCCCCCCCCCCCCc.",
    "..cccccccccccc..",
    "................",
    "................",
    "................"
   ]
  },
  "sword": {
   "palette": {
    "c": "#1d6f6a",
    "C": "#3ad3ca",
    "w": "#b6f7f1",
    "s": "#6f4f36",
    "S": "#8b6644",
    "k": "#3a2a17"
   },
   "rows": [
    "..............cc",
    ".............cwc",
    "............cwCc",
    "...........cwCc.",
    "..........cwCc..",
    ".........cwCc...",
    "........cwCc....",
    "...cc..cwCc.....",
    "...cCccwCc......",
    "....cCwCc.......",
    ".....cCc........",
    "....sScCc.......",
    "...sSs.cCc......",
    "..sSs...cc......",
    ".kSs............",
    ".kk............."
   ]
  },
  "potion": {
   "palette": {
    "g": "#7f98ab",
    "w": "#e8f1f7",
    "P": "#d79bf0",
    "p": "#a64fc9",
    "k": "#8b6644"
   },
   "rows": [
    "................",
    "......kkkk......",
    "......kkkk......",
    ".......gg.......",
    ".......gg.......",
    "......gwwg......",
    ".....gwPPpg.....",
    "....gwPPpppg....",
    "....gPPppppg....",
    "....gPpppppg....",
    "....gppppppg....",
    "....gppppppg....",
    ".....gppppg.....",
    "......gggg......",
    "................",
    "................"
   ]
  },
  "book": {
   "palette": {
    "b": "#6b3219",
    "B": "#a85a30",
    "w": "#f3ead2",
    "y": "#e3b341"
   },
   "rows": [
    "................",
    "..bbbbbbbbbbb...",
    "..bBBBBBBBBBbw..",
    "..bBBBBBBBBBbw..",
    "..bBByyyyBBBbw..",
    "..bBBBBBBBBBbw..",
    "..bBBBBBBBBBbw..",
    "..bBBBBBBBBBbw..",
    "..bBBBBBBBBBbw..",
    "..bBBBBBBBBBbw..",
    "..bBBBBBBBBBbw..",
    "..bBBBBBBBBBbw..",
    "..bbbbbbbbbbbw..",
    "...wwwwwwwwwww..",
    "................",
    "................"
   ]
  }
 },
 "line": {
  "bolt": "<path d=\"M13.5 2 5 13.2h4.2l-1.2 8.8 9-12.2h-4.3L13.5 2z\" fill=\"currentColor\" stroke=\"none\"/>",
  "owl": "<path d=\"M12 2.5c-4.6 0-7.8 3.2-7.8 8.2 0 5.7 3.6 10.8 7.8 10.8s7.8-5.1 7.8-10.8c0-5-3.2-8.2-7.8-8.2z\"/><circle cx=\"8.7\" cy=\"10\" r=\"3.1\"/><circle cx=\"15.3\" cy=\"10\" r=\"3.1\"/><circle cx=\"8.7\" cy=\"10\" r=\"1.1\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"15.3\" cy=\"10\" r=\"1.1\" fill=\"currentColor\" stroke=\"none\"/><path d=\"M12 13.2l-1.3 2.2h2.6z\" fill=\"currentColor\" stroke=\"none\"/><path d=\"M5.2 5.6 7.4 8M18.8 5.6 16.6 8\"/>",
  "wand": "<path d=\"M3.8 20.2 15.4 8.6\"/><path d=\"M14 7.2 16.8 10\"/><path d=\"M19 3v3.2M17.4 4.6h3.2M18.2 9.4l1.6 1.6M20.6 9.4 19 11\"/>",
  "hourglass": "<path d=\"M7 2.8h10M7 21.2h10\"/><path d=\"M8.2 2.8c0 4.8 7.6 4.8 7.6 9.2s-7.6 4.4-7.6 9.2\"/><path d=\"M15.8 2.8c0 4.8-7.6 4.8-7.6 9.2s7.6 4.4 7.6 9.2\"/>",
  "paw": "<ellipse cx=\"6.4\" cy=\"9.6\" rx=\"2.1\" ry=\"2.7\"/><ellipse cx=\"10.4\" cy=\"6.6\" rx=\"2.1\" ry=\"2.8\"/><ellipse cx=\"14.6\" cy=\"6.6\" rx=\"2.1\" ry=\"2.8\"/><ellipse cx=\"18.2\" cy=\"9.9\" rx=\"2.1\" ry=\"2.7\"/><path d=\"M12.4 12.4c3.4 0 5.6 2.3 5.6 4.6 0 2.2-2.1 3.6-5.6 3.6s-5.6-1.4-5.6-3.6c0-2.3 2.2-4.6 5.6-4.6z\"/>",
  "steps": "<ellipse cx=\"8\" cy=\"7.4\" rx=\"3\" ry=\"4.4\" transform=\"rotate(-14 8 7.4)\"/><ellipse cx=\"16.2\" cy=\"15.4\" rx=\"3\" ry=\"4.4\" transform=\"rotate(-14 16.2 15.4)\"/><circle cx=\"5.4\" cy=\"12.6\" r=\"1\"/><circle cx=\"13.6\" cy=\"20.6\" r=\"1\"/>",
  "star": "<path d=\"M12 2.6 14.7 9.2 21.7 9.8 16.4 14.4 18 21.4 12 17.6 6 21.4 7.6 14.4 2.3 9.8 9.3 9.2z\"/>",
  "cup": "<path d=\"M4.6 8.6h12.2v4.2a6.1 6.1 0 0 1-12.2 0z\"/><path d=\"M16.8 9.6h2.1a2.1 2.1 0 0 1 0 4.2h-2.1\"/><path d=\"M3.4 20.4h15.2\"/><path d=\"M8.6 4.6c0 1.4 1.6 1.4 1.6 2.8M12.6 3.6c0 1.6 1.6 1.6 1.6 3\"/>",
  "quill": "<path d=\"M4 20.4c6.6-1.2 11.4-5.6 15.6-16.8C13.4 5 7 9 4 20.4z\"/><path d=\"M4 20.4c3.6-3.4 7-6 11.2-8.6\"/>",
  "castle": "<path d=\"M3.4 21.2V9.6h3.2V6.4h2.6v3.2h2.4V4.8h2.8v4.8h2.4V6.4h2.6v3.2h3.2v11.6z\"/><path d=\"M9.6 21.2v-5.4h4.8v5.4\"/>",
  "key": "<circle cx=\"8\" cy=\"8.2\" r=\"3.6\"/><path d=\"M10.6 10.8 19.4 19.6\"/><path d=\"M15.8 16 18 13.8M18.4 18.6l2.2-2.2\"/>",
  "scroll": "<path d=\"M5.4 4.6h13.2v14.8H5.4z\"/><path d=\"M8.2 8.4h7.6M8.2 12h7.6M8.2 15.6h4.8\"/>",
  "sword": "<path d=\"M19.5 3.5 9 14\"/><path d=\"M19.5 3.5 18.8 7.2 9.8 16.2 7.8 14.2 16.8 5.2z\"/><path d=\"M6.2 13.4l4.4 4.4M8.4 15.6 4.2 19.8\"/>",
  "book": "<path d=\"M4.5 4.5h6.2c.9 0 1.3.6 1.3 1.4v14c0-.8-.5-1.4-1.3-1.4H4.5z\"/><path d=\"M19.5 4.5h-6.2c-.9 0-1.3.6-1.3 1.4v14c0-.8.5-1.4 1.3-1.4h6.2z\"/>",
  "heart": "<path d=\"M12 20.2S3.6 15.1 3.6 9.2A4.4 4.4 0 0 1 12 7.3a4.4 4.4 0 0 1 8.4 1.9c0 5.9-8.4 11-8.4 11z\"/>",
  "map": "<path d=\"M3.6 5.8 9 3.8l6 2.4 5.4-2v14l-5.4 2-6-2.4-5.4 2z\"/><path d=\"M9 3.8v14M15 6.2v14\"/><path d=\"M5.6 11.2l1.6 1.6M7.2 11.2l-1.6 1.6\"/>",
  "compass": "<circle cx=\"12\" cy=\"12\" r=\"8.4\"/><path d=\"M14.8 9.2 13.2 13.2 9.2 14.8 10.8 10.8z\" fill=\"currentColor\" stroke=\"none\"/>",
  "anchor": "<circle cx=\"12\" cy=\"5.2\" r=\"1.8\"/><path d=\"M12 7v13.4M8.6 10.2h6.8\"/><path d=\"M4.4 13.4c.4 4 3.6 7 7.6 7s7.2-3 7.6-7\"/><path d=\"M4.4 13.4l-1 1.8M19.6 13.4l1 1.8\"/>",
  "ship": "<path d=\"M3.4 15.6h17.2l-2.6 4.6H6z\"/><path d=\"M12 3.6v12\"/><path d=\"M12 4.6l6 8.6h-6zM11 6.2 6.4 13.2H11z\"/>",
  "coin": "<circle cx=\"12\" cy=\"12\" r=\"8.2\"/><circle cx=\"12\" cy=\"12\" r=\"5.6\"/><path d=\"M12 9v6\"/>"
 }
};
  if (typeof module === 'object' && module.exports) module.exports = ART;
  else root.STORYQUEST_ART = ART;
})(this);
