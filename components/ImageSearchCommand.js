const imageSearchBaseURL = 'https://images.google.com/searchbyimage?image_url=';
class ImageSearchCommand {

	get description() {
		return 'Search up the top google result for an image attachment, image link, or the most recent image posted in chat.'
	}

	get icon() {
		return '🔎'
	}

	get arguments() {
		return ['[image url **OR** image attachment]']
	}

	get alias() {
		return ['imgsearch', 'ims'];
	}

	getImageFromMessage(message) {
		for(var attchFlake of message.attachments) {
			const attachment = attchFlake[1];
			
			if(!isNaN(attachment.height)) return attachment.url;
		}
		return null;
	}
	
	getNextGoogleResult(html) {
		
		var index = html.indexOf('<h3 class="LC20lb">');
		var index2 = html.indexOf('</h3>', index);
		
		log("getNextGoogleResult()", index, "index1", this);
		log("getNextGoogleResult()", index2, "index2", this);
		
		return [html.substring(index, index2), html.substring(index2)];
	}	

	async run(args, bot, message) {

		message.channel.send("This command is temporarily disabled due to Google services requiring funds to use their vision API. Come back later!");
		return;
	
		//get back to all this when i get payment stuff figured out
	
		var img = null;

		if(args.length == 0) {
			img = this.getImageFromMessage(message);

			if(img == null) {
				await message.channel.fetchMessages({limit:10})
				.then((messages => {
					for(var mColl of messages) {
						const msg = mColl[1];

						const msgImg = this.getImageFromMessage(msg);

						log("msgImg", msgImg, this);
						
						if(msgImg !== null) 
						{
							img = msgImg;
							break;
						}
					}
				}).bind(this));
					
				if(img == null) {
					message.channel.send("There are no recent images sent in this channel! Try specifying an image (or image link) instead.")
					return;
				}
			}
		} else {
			img = args[0]; //need to do detection stuff

		}
		
		//if(img != null)
		request(imageSearchBaseURL + img, (function(err, response, body) {
			//body.querySelectorAll('h3')
			
			console.log(body);
			
			var result = this.getNextGoogleResult(body)[0];
			
			console.log(result);
		}).bind(this));
			
		//const results = await vision_client.labelDetection(img);
		//console.log(results.labelAnnotations.join(' '));

	}
}