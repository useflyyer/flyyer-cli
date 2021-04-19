import svgToMiniDataURI from "mini-svg-data-uri";

export const ORIGINAL = `<svg width="100" height="100" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="17" y="29" width="81" height="31" rx="5" fill="#5133FF"/><path d="M7 40.5h71c2 0 3.5 1.6 3.5 3.5v21c0 2-1.5 3.5-3.5 3.5H7c-2 0-3.5-1.6-3.5-3.5V44c0-2 1.6-3.5 3.5-3.5z" stroke="#fff" stroke-width="3"/><path d="M2 44a5 5 0 015-5h46v31H7a5 5 0 01-5-5V44z" fill="url(#paint0_linear)"/><defs><linearGradient id="paint0_linear" x1="27.5" y1="39" x2="27.5" y2="63.3" gradientUnits="userSpaceOnUse"><stop stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".4"/></linearGradient></defs></svg>`;

export const ENCODED = svgToMiniDataURI(ORIGINAL);
