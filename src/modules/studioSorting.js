exportModule({
	id: "studioSorting",
	description: "Add sorting options to studio pages [under development]",
	isDefault: true,
	categories: ["Browse","Newly Added"],
	visible: true,
	urlMatch: function(url,oldUrl){
		return url.match(/https:\/\/anilist\.co\/studio\//)
	},
	code: function(){
		if(document.querySelector(".hohStudioSubstitute")){
			document.querySelector(".hohStudioSubstitute").remove()
		}
		if(document.querySelector(".hohStudioSorter")){
			document.querySelector(".hohStudioSorter").remove()
		}
		let buttonInserter = function(){
			if(!document.URL.match(/https:\/\/anilist\.co\/studio\//)){
				return
			}
			let switchL = document.querySelector(".page-content .header");
			if(switchL){
				let switcher = create("div","hohStudioSorter",false,switchL,"position: absolute;top: 33px;");
				let fakeContent = create("div",["hohStudioSubstitute","container","grid-wrap"],false,"display:none;");
				switchL.parentNode.parentNode.insertBefore(fakeContent,switchL.parentNode.nextElementSibling);
				let normalSort = create("span","selected","Normal",switcher);
				let popularitySort = create("span",false,"Popularity",switcher);
				let scoreSort = create("span",false,"Score",switcher);

				let rankingData = null;
				const rankingQuery = `
query($id: Int){
	Studio(id: $id){
		popularity:media(sort:POPULARITY_DESC){
			edges{
				isMainStudio
				node{
					... mediaEntry
				}
			}
		}
		score:media(sort:SCORE_DESC){
			edges{
				isMainStudio
				node{
					... mediaEntry
				}
			}
		}
	}
}

fragment mediaEntry on Media{
	id
	format
	coverImage{large color}
	title{romaji native english}
	averageScore
	popularity
	status
	season
	nextAiringEpisode{
		episode
		timeUntilAiring
	}
	genres
	siteUrl
	description(asHtml: true)
	startDate{year month day}
	mediaListEntry{
		status
	}
}`;
				let renderSubstitute = function(){
					rankingData.slice(0,25).forEach(show => {
						let card = create("div","media-card",false,fakeContent);
						if(show.isMain){
							card.classList.add("isMain")
						}
						card.style.cssText = "--media-color:" + (show.coverImage.color || 90) + ";";
						let cover = create("a","cover",false,card)
							cover.href = show.siteUrl;
							cover.style.backgroundImage = "url(\"" + show.coverImage.large + "\")";
							if(show.mediaListEntry){
								let listStatus = create("div","list-status",false,cover);
								listStatus.setAttribute("status",capitalize(show.mediaListEntry.status.toLowerCase()));
								listStatus.title = capitalize(show.mediaListEntry.status.toLowerCase());
								listStatus.style.background = distributionColours[show.mediaListEntry.status]
							}
							let overlay = create("div","overlay",false,cover);
								let title = create("a","title",titlePicker(show),overlay).href = show.siteUrl;
						let data = create("div","data",false,card);
							let airingCountdown = create("div","airing-countdown",false,data);
							if(
								show.nextAiringEpisode && (show.status === "RELEASING" || show.nextAiringEpisode.timeUntilAiring < 60*24*60*60)
							){
								let days = Math.floor(show.nextAiringEpisode.timeUntilAiring/(24*3600));
								let hours = Math.floor((show.nextAiringEpisode.timeUntilAiring - 24*3600 * days)/3600);
								let minutes = Math.round((show.nextAiringEpisode.timeUntilAiring - 24*3600 * days - 3600 * hours)/60);
								airingCountdown.innerText = "Ep " + show.nextAiringEpisode.episode + " -";
								if(days){
									airingCountdown.innerText += " " + days + "d";
								}
								if(hours){
									airingCountdown.innerText += " " + hours + "h";
								}
								if(minutes){
									airingCountdown.innerText += " " + minutes + "m";
								}
							}
							else if(show.season){
								if(show.season === "WINTER" && show.startDate.month === 12){
									airingCountdown.innerText = capitalize(show.season.toLowerCase()) + " " + (show.startDate.year + 1)
								}
								else{
									airingCountdown.innerText = capitalize(show.season.toLowerCase()) + " " + (show.startDate.year || "")
								}
							}
							else if(show.startDate.year){
								airingCountdown.innerText = show.startDate.year
							}
							else if(show.status === "RELEASING"){
								airingCountdown.innerText = "Airing"
							}
							else if(show.status === "NOT_YET_RELEASED"){
								airingCountdown.innerText = "Not yet released"
							}
							else if(show.status === "CANCELLED"){
								airingCountdown.innerText = "Cancelled"
							}
							let extra = create("div",["extra","full-width"],false,data);
								if(show.format){
									let format = create("span","format",distributionFormats[show.format],extra)
								}
								if(show.averageScore){
									let avgScore = create("span",false,show.averageScore + "%",extra).title = "Average score (weighted)";
								}
								if(show.popularity){
									let popularity = create("span","popularity",show.popularity,extra).title = "Popularity";
								}
							let description = create("div","description",false,data);
								description.innerHTML = DOMPurify.sanitize(show.description);
							let genres = create("div","genres",show.genres.join(", "),data);
					})
				}
				normalSort.onclick = function(){
					if(!fakeContent.parentNode.querySelector(".grid-wrap:not(.hohStudioSubstitute)")){
						return
					}
					switcher.querySelector(".selected").classList.remove("selected");
					normalSort.classList.add("selected");
					fakeContent.parentNode.querySelector(".grid-wrap:not(.hohStudioSubstitute)").style.display = "grid";
					fakeContent.style.display = "none";
					removeChildren(fakeContent)
				}
				popularitySort.onclick = function(){
					if(!fakeContent.parentNode.querySelector(".grid-wrap:not(.hohStudioSubstitute)")){
						return
					}
					switcher.querySelector(".selected").classList.remove("selected");
					popularitySort.classList.add("selected");
					fakeContent.parentNode.querySelector(".grid-wrap:not(.hohStudioSubstitute)").style.display = "none";
					fakeContent.style.display = "grid";
					removeChildren(fakeContent);
					if(rankingData){
						rankingData.sort((b,a) => a.popularity - b.popularity || a.score - b.score);
						renderSubstitute()
					}
					else{
						authAPIcall(
							rankingQuery,
							{id: parseInt(document.URL.match(/studio\/(\d+)\//)[1])},function(data){	
								rankingData = uniqueBy(
									data.data.Studio.popularity.edges.concat(
										data.data.Studio.score.edges
									).map(edge => {
										edge.node.isMain = edge.isMainStudio;
										return edge.node
									}),
									a => a.id
								);
								rankingData.sort((b,a) => a.popularity - b.popularity || a.score - b.score);
								renderSubstitute()
							}
						)
					}
				}
				scoreSort.onclick = function(){
					if(!fakeContent.parentNode.querySelector(".grid-wrap:not(.hohStudioSubstitute)")){
						return
					}
					switcher.querySelector(".selected").classList.remove("selected");
					scoreSort.classList.add("selected");
					fakeContent.parentNode.querySelector(".grid-wrap:not(.hohStudioSubstitute)").style.display = "none";
					fakeContent.style.display = "grid";
					removeChildren(fakeContent);
					if(rankingData){
						rankingData.sort((b,a) => a.averageScore - b.averageScore || a.popularity - b.popularity);
						renderSubstitute()
					}
					else{
						authAPIcall(
							rankingQuery,
							{id: parseInt(document.URL.match(/studio\/(\d+)\//)[1])},function(data){	
								rankingData = uniqueBy(
									data.data.Studio.popularity.edges.concat(
										data.data.Studio.score.edges
									).map(edge => {
										edge.node.isMain = edge.isMainStudio;
										return edge.node
									}),
									a => a.id
								);
								rankingData.sort((b,a) => a.averageScore - b.averageScore || a.popularity - b.popularity);
								renderSubstitute()
							}
						)
					}
				}
			}
			else{
				setTimeout(buttonInserter,200)
			}
		};buttonInserter()
	}
})
