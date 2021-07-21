dialog_options();

async function main(opt){
    opt.npc_count = await npc_count_get();
    opt.party_level_average = await party_level_average_get()

    for (let token of canvas.tokens.controlled){    //Loop through all selected tokens
        if (token.actor.type != "npc"){ continue; } //Skip it if it's not an npc

        let TADD = token.actor.data.data;           //Used for READING data from token
        let AD   = "actorData.data.";               //Used for WRITING data to token

        //Reset some params for each token
        let tok = [];
        tok.abilities = [];
        tok.data_to_update = [];
        tok.items_to_add = [];
        tok.items_to_delete = [];
        tok.opt = opt;

        //Get token data before adjustment
        tok.alignment = TADD.details.alignment;                         //Alignment
        tok.cr_old = TADD.details.cr;                                   //NPC CR old
        if (tok.cr_old < 1){ tok.cr_old = 1; }
        tok.adjust_factor = (tok.cr_old + opt.npc_cr) / tok.cr_old;     //Adjust Factor
        tok.cr_new = parseInt(tok.cr_old * tok.adjust_factor + 0.5);    //NPC CR new
        tok.data_to_update[AD+"details.cr"] = tok.cr_new;
        tok.race = TADD.details.race
        tok.type = TADD.details.type.value;                             //Type of NPC (Humanoid, etc)
        
        tok.spellcasting = await can_cast_spells(token);                //Can cast spells?
        if (tok.spellcasting){
            tok.spellcaster_type = TADD.attributes.spellcasting;
        } else {
            tok.spellcaster_type = false;
        }
        
        //Choose Template
        tok.template = await template_choose(tok);
        console.log(tok);

        //Adjust Abilities (Stats)
        if (opt.adjust_abilities){
            tok.abilities.add_points = Math.ceil(opt.npc_cr / 3);
            for (let a of tok.template.attributes){
                tok.abilities[a] = parseInt(TADD.abilities[a].value) + tok.abilities.add_points;
                if (tok.abilities[a] > 25){ tok.abilities[a] = 25; }
                tok.data_to_update[AD+"abilities." + a + ".value"] = tok.abilities[a];
            }
        }
        
        //Adjust HP
        if (opt.adjust_hp){
            let hp = TADD.attributes.hp.max;
            tok.hp = parseInt(tok.cr_new * 20);
            tok.data_to_update[AD+"attributes.hp.max"] = tok.hp;
        }

        //Adjust Movement: Adjust up or down by 1 foot per CR 
        if (opt.adjust_movement){
            for (let m of ["burrow","climb","fly","swim","walk"]){
                let cur_m = TADD.attributes.movement[m];
                if (cur_m > 0){
                    tok["movement_" + m] = parseInt(cur_m + opt.npc_cr);
                    tok.data_to_update[AD+"attributes.hp.movement." + m] = tok["movement_" + m];
                }
            }
        }

        //Is npc a humanoid
        if (tok.type == "humanoid"){
            
            //Armor
            if (opt.adjust_armor){
                let armor_plus_str = await armor_get(tok);
                tok.items_to_add.push(["dnd5e.items", armor_plus_str])    
            }
            
            //Weapons
            if (opt.adjust_weapons){
                let weapon_melee_str = await weapon_melee_get(tok);
                tok.items_to_add.push(["dnd5e.items", weapon_melee_str]);
                let weapon_range_str = await weapon_range_get(tok);
                tok.items_to_add.push(["dnd5e.items", weapon_range_str]);
            }
            
            //Spells
            if (tok.spellcasting){
                let new_spelllevel = parseInt(tok.cr_new * 1.25);
                //let update = [];
                //update[AD+"details.spellLevel"] = new_spelllevel;
                //await token.document.update(update);            //Has to be updated early to reset spell slots
                tok.data_to_update[AD+"details.spellLevel"] = new_spelllevel;
                
                //Load spells based on template
                let spells = spells_get(tok);
                
                
            }
            
        } else {
            //Not Humanoid
            
            //Improve AC
            
        }
        
        //Do all updates that need done
        await item_types_remove(token, tok);                //Remove all selected item types
        await items_add(token, tok.items_to_add);           //Add all items
        await items_equip_all(token);                       //Equip, identify, make proficient all items
        await token.document.update(tok.data_to_update);    //Update all token data at once!
        await token.actor.longRest({ dialog: false });      //Refresh spellslots and hp

        console.log(tok);
        console.log(token);

        //Cleanup token health bars
        
        
        //What race is NPC
        //  token.data.data.details.race
        
        
        //----------------------------------------------------------------------------------

        
        
        //----------------------------------------------------------------------------------
        
        
        
        //Give them a title?
    
        //Social Status

        // Do they have a shield?

    
        
        // Maybe later =============================================
        //Upgrade weapons
        //    Club -> Mace -> Great Mace
        
        
        


        //Add some languages?
        
        //Add special senses?


        //Adjust Age
    }

}

/*=================================================================
    Functions
  =================================================================*/
async function armor_get(tok){
    let armor = [];
    armor.push("None");                     // 10 1
    armor.push("Padded Armor");             // 11 2
    armor.push("Leather Armor");            // 11 3
    armor.push("Studded Leather Armor");    // 12 4
    armor.push("Hide Armor");               // 12 5
    armor.push("Chain Shirt");              // 13 6
    armor.push("Breastplate");              // 14 7
    armor.push("Ring Mail");                // 14 8
    armor.push("Scale Mail");               // 14 9
    armor.push("Half Plate Armor");         // 15 10
    armor.push("Chain Mail");               // 16 11
    armor.push("Splint Armor");             // 17 12
    armor.push("Plate Armor");              // 18 13
    let armor_number = 0;
    if (tok.cr_new > 0 && tok.cr_new < 5){ armor_number = roll_simple(4); }
    if (tok.cr_new > 4 && tok.cr_new < 9){ armor_number = roll_simple(4) + 4; }
    if (tok.cr_new >= 10){                 armor_number = roll_simple(4) + 8; }
    
    //Add a plus to the armor
    let armor_plus = parseInt(tok.cr_new / 4);
    let armor_plus_str = "";
    if (armor_plus == 0){
        armor_plus_str = armor[armor_number];
    } else if (armor_plus > 3){
        armor_plus_str = armor[armor_number] + " +3";
    } else {
        armor_plus_str = armor[armor_number] + " +" + armor_plus;
    }
    return armor_plus_str;
}
async function can_cast_spells(token){
    let spellcasting = false;
    for (let i of token.actor.items){
        if (i.data.name == "Spellcasting"){
            spellcasting = true;
        }
    }
    return spellcasting;
}

async function item_types_remove(token, tok){
    let item_types_to_delete = [];
    if (tok.opt.clear_armor){   item_types_to_delete.push("equipment"); }
    if (tok.opt.clear_spells){  item_types_to_delete.push("spell"); }
    if (tok.opt.clear_weapons){ item_types_to_delete.push("weapon"); }
    for (let i of token.actor.items){
        if (item_types_to_delete.includes(i.type)){
            tok.items_to_delete.push(i._id);
        }
    }
    await items_delete(token, tok.items_to_delete)
}

async function items_add(token, items) {
    let entities = []
    for (let i of items){
        let pack = await game.packs.get(i[0]);
        let index = await pack.getIndex();
        let entry = await index.find(e => e.name === i[1]);
        let entity = await pack.getDocument(entry._id);
        entities.push(entity.data.toObject());
    }
    //console.log(entities);
    await token.actor.createEmbeddedDocuments("Item", entities);
}

async function items_delete(token, items){
    await token.actor.deleteEmbeddedDocuments( "Item", items );
}
//token.actor.deleteEmbeddedDocuments("ActiveEffect", [effect.id]);

async function items_equip_all(token){
    for (let i of token.actor.items){
        await item_equipped_identified_proficient(token, i)
    }
}

async function item_equipped_identified_proficient(token, item){
    await token.actor.updateEmbeddedDocuments("Item", [{
        _id:item.id, 
        data:{
            equipped: true,
            identified: true,
            proficient: true
        }
        }]
    );
}

function npc_count_get(){
    let npc_count = 0;
    for (let t of canvas.tokens.controlled){
        npc_count++;
    }
    return npc_count;
}
function party_level_average_get(){
    let party_count = 0;
    let party_level_total = 0;
    //console.log(canvas.tokens.placeables)
    for (let t of canvas.tokens.placeables){
        if (t.actor){
            let a = game.actors.get(t.actor.id);
            if (a.data.type){
                if (a.data.type != "npc"){
                    party_count++;
                    for (const [key, value] of Object.entries(a.data.data.classes)) {
                        party_level_total += value.levels;
                    }
                }
            }
        }
    }
    return parseInt(party_level_total / party_count);
}

function roll_simple(d){
    return Math.floor(Math.random() * d) + 1
}
function roll_no1_no2(qty, d){
    let total = 0;
    for (let i = 0; i < qty; i++){
        let r = Math.floor(Math.random() * d) + 1
        if (r < 3){ r = 3; }
        total = total + r;
    }
    return total;
}

async function spells_get(tok){
    
}

async function template_choose(tok){
    let template = [];
    let type = tok.opt.template_str;

    //Even if "generic" was chosen, use some sense to figure out what kind of NPC we are dealing with
    if (type == "generic"){
        //Figure out if npc can cast spells
        if (tok.spellcasting){
            if (tok.spellcaster_type == "wis"){
                template.class = "cleric";
            } else {
                template.class = "wizard";
            }            
        } else {
            template.class = "fighter";
        }
    }
    switch(template.class){
        case "cleric":
            template.class = "Cleric";
            template.attributes = ["con","dex","wis"];
            template.spell_list = ["Heal","Raise Dead"];
            break;
        case "fighter":
            template.class = "Fighter";
            template.attributes = ["dex","wis","str"];
            template.spell_list= [];
            break;
        case "wizard":
            template.class = "Wizard";
            template.attributes = ["con","dex","int"];
            template.spell_list = ["Magic Missile","Fireball"];
            break;
    }
    console.log(template);
    return template;
}

async function token_update(token, tok){
    await token.document.update(tok.data_to_update);
}

async function weapon_melee_get(tok){
    let weapon_m = [];
    weapon_m.push("Dagger");
    weapon_m.push("Greatsword");
    weapon_m.push("Longsword");
    weapon_m.push("Mace");
    weapon_m.push("Shortsword");
    weapon_m.push("Greataxe");
    weapon_m.push("Battleaxe");
    weapon_m.push("Handaxe");
    weapon_m.push("Maul");
    weapon_m.push("Spear");
    weapon_m.push("Scimitar");
    weapon_m.push("Flail");
    weapon_m.push("Quarterstaff");
    weapon_m.push("Glaive");
    weapon_m.push("Halberd");
    weapon_m.push("Lance");
    weapon_m.push("Light Hammer");
    weapon_m.push("Morningstar");
    weapon_m.push("Pike");
    weapon_m.push("Rapier");
    weapon_m.push("Sickle");
    weapon_m.push("Trident");
    weapon_m.push("War Pick");
    weapon_m.push("Warhammer");
    weapon_m.push("Whip");
    let weapon_melee_number = roll_simple(25) - 1;
    //Add a plus to the weapons
    let weapon_plus = parseInt(tok.cr_new / 4);
    let weapon_plus_str = "";
    if (weapon_plus == 0){
        weapon_plus_str = weapon_m[weapon_melee_number];
    } else if (weapon_plus > 3){
        weapon_plus_str = weapon_m[weapon_melee_number] + " +3";
    } else {
        weapon_plus_str = weapon_m[weapon_melee_number] + " +" + weapon_plus;
    }
    return weapon_plus_str;
}
async function weapon_range_get(tok){
    let weapon_r = [];
    weapon_r.push("Blowgun");
    weapon_r.push("Dart");
    weapon_r.push("Javelin");
    weapon_r.push("Spear");
    weapon_r.push("Sling");
    weapon_r.push("Shortbow");
    weapon_r.push("Longbow");
    weapon_r.push("Heavy Crossbow");
    weapon_r.push("Hand Crossbow");
    weapon_r.push("Light Crossbow");
    let weapon_range_number = roll_simple(10) - 1;
    //Add a plus to the weapons
    let weapon_plus = parseInt(tok.cr_new / 4);
    let weapon_plus_str = "";
    if (weapon_plus == 0){
        weapon_plus_str = weapon_r[weapon_range_number];
    } else if (weapon_plus > 3){
        weapon_plus_str = weapon_r[weapon_range_number] + " +3";
    } else {
        weapon_plus_str = weapon_r[weapon_range_number] + " +" + weapon_plus;
    }
    return weapon_plus_str;
}

//================================== Dialogs ==================================
function dialog_options(){
    console.log("dialog_options");
    let d = new Dialog({
        title: "NPC Upgrade Options",
        content: `
            <form>
                <div class="form-group">
                    <label>Adjust NPC CR:</label>
                    <select id="scale-npc-cr" name="scale-npc-cr">
                        <option value="-5">-5</option>
                        <option value="-4">-4</option>
                        <option value="-3">-3</option>
                        <option value="-2">-2</option>
                        <option value="-1">-1</option>
                        <option value="0" selected>0</option>
                        <option value="1">+1</option>
                        <option value="2">+2</option>
                        <option value="3">+3</option>
                        <option value="4">+4</option>
                        <option value="5">+5</option>
                        <option value="6">+6</option>
                        <option value="7">+7</option>
                        <option value="8">+8</option>
                        <option value="9">+9</option>
                        <option value="10">+10</option>
                    </select>
                </div>
                <hr>
                <div class="form-group">
                    <label>Template:</label>
                    <select id="npc_template" name="npc_template">
                        <option value="generic" selected>Generic</option>
                        <option value="cleric">Cleric</option>
                        <option value="fighter">Fighter</option>
                        <option value="wizard">Wizard</option>
                    </select>
                </div>
                <hr>
                <center><div>NPC Adjustments</div></center>
                <div class="form-group">    <label>Abilities:</label>     <input id='adjust_abilities' type='checkbox' checked /></div>
                <div class="form-group">    <label>Age:</label>           <input id='adjust_age' type='checkbox' checked /></div>
                <div class="form-group">    <label>Armor:</label>         <input id='adjust_armor' type='checkbox' checked /></div>
                <div class="form-group">    <label>HP:</label>            <input id='adjust_hp' type='checkbox' checked /></div>
                <div class="form-group">    <label>Movement:</label>      <input id='adjust_movement' type='checkbox' checked /></div>
                <div class="form-group">    <label>Size:</label>          <input id='adjust_size' type='checkbox' checked /></div>
                <div class="form-group">    <label>Spells:</label>        <input id='adjust_spells' type='checkbox' checked /></div>
                <div class="form-group">    <label>Weapons:</label>       <input id='adjust_weapons' type='checkbox' checked /></div>
                <hr>
                <center><div>Clear Current</div></center>
                <div class="form-group">    <label>Armor:</label>   <input id='armor_clear' type='checkbox' checked /></div>
                <div class="form-group">    <label>Spells:</label>  <input id='spells_clear' type='checkbox' checked /></div>
                <div class="form-group">    <label>Weapons:</label> <input id='weapons_clear' type='checkbox' checked /></div>
            </form>
        `,
      buttons: {
        yes: {
          icon: "<i class='fas fa-check'></i>",
          label: "Upgrade",
          callback: () => {
              //Get all options from Form
              let opt = [];
              let e = document.getElementById("scale-npc-cr");
              opt.npc_cr = parseInt(e.options[e.selectedIndex].value);
              
              console.log("opt.npc_cr: " + opt.npc_cr);
              
              e = document.getElementById("npc_template");
              opt.template_str = e.options[e.selectedIndex].value;

              opt.adjust_abilities = document.getElementById("adjust_abilities").checked
              opt.adjust_armor     = document.getElementById("adjust_armor").checked
              opt.adjust_hp        = document.getElementById("adjust_hp").checked
              opt.adjust_movement  = document.getElementById("adjust_movement").checked
              opt.adjust_spells    = document.getElementById("adjust_spells").checked
              opt.adjust_weapons   = document.getElementById("adjust_weapons").checked

              opt.clear_armor      = document.getElementById("armor_clear").checked
              opt.clear_spells     = document.getElementById("spells_clear").checked
              opt.clear_weapons    = document.getElementById("weapons_clear").checked

              main(opt);
          }
        },
        no: {
          icon: "<i class='fas fa-times'></i>",
          label: "Cancel"
        },
      },
      default: "yes"
    }).render(true);
}