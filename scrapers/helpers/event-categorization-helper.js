/**
 * Event Categorization Helper
 * Use this in all event scrapers to ensure consistent categorization
 */

// Event categorization rules
function categorizeEvent(event) {
  const name = (event.name || '').toLowerCase();
  const description = (event.description || '').toLowerCase();
  const subcategory = (event.subcategory || '').toLowerCase();
  const parentCategory = (event.parentCategory || '').toLowerCase();
  const text = `${name} ${description} ${subcategory} ${parentCategory}`;
  
  let newCategory = 'Community Events'; // Default
  let newSubcategory = 'Community Event';

  // GYMNASTICS - Check first to ensure priority
  if (text.includes('gymnastic') || text.includes('tumbl') || text.includes('tumbling')) {
    newCategory = 'Indoor Activities';
    newSubcategory = 'Gymnastics Class';
  }

  // INDOOR ACTIVITIES (Physical play, ninja, movement)
  else if (text.includes('ninja') ||
      text.includes('obstacle') ||
      text.includes('open gym') ||
      text.includes('open play') ||
      text.includes('parent & me') ||
      text.includes('parent and me') ||
      text.includes('rolly polly') ||
      text.includes('trampoline park') ||
      text.includes('foam pit') ||
      text.includes('movement class') ||
      text.includes('indoor play') ||
      subcategory.includes('open play') ||
      subcategory.includes('parent & me')) {
    newCategory = 'Indoor Activities';

    if (text.includes('ninja')) newSubcategory = 'Ninja Warrior';
    else if (text.includes('open gym') || text.includes('open play')) newSubcategory = 'Open Play/Gym';
    else if (text.includes('trampoline')) newSubcategory = 'Trampoline Park';
    else if (text.includes('parent & me') || text.includes('parent and me')) newSubcategory = 'Parent & Me Class';
    else newSubcategory = 'Indoor Activity';
  }
  
  // STORYTIMES & LIBRARY
  else if (text.includes('storytime') ||
           text.includes('story time') ||
           subcategory.includes('storytime') ||
           text.includes('library program') ||
           text.includes('toddler time') ||
           text.includes('baby time') ||
           text.includes('babies') ||
           text.includes('preschool time') ||
           (text.includes('library') && (text.includes('baby') || text.includes('toddler') || text.includes('preschool')))) {
    newCategory = 'Storytimes & Library';
    
    if (text.includes('baby') || subcategory.includes('baby')) newSubcategory = 'Baby Storytime';
    else if (text.includes('toddler') || subcategory.includes('toddler')) newSubcategory = 'Toddler Storytime';
    else if (text.includes('preschool') || subcategory.includes('preschool')) newSubcategory = 'Preschool Storytime';
    else if (text.includes('family') || subcategory.includes('family')) newSubcategory = 'Family Storytime';
    else newSubcategory = 'Library Program';
  }
  
  // FESTIVALS & CELEBRATIONS
  else if (text.includes('festival') ||
           text.includes('fair') ||
           text.includes('holiday') ||
           text.includes('halloween') ||
           text.includes('christmas') ||
           text.includes('easter') ||
           text.includes('thanksgiving') ||
           text.includes('celebration') ||
           subcategory.includes('holiday') ||
           subcategory.includes('festival') ||
           subcategory.includes('celebration') ||
           text.includes('seasonal event')) {
    newCategory = 'Festivals & Celebrations';
    
    if (text.includes('holiday') || text.includes('halloween') || text.includes('christmas') || subcategory.includes('holiday')) {
      newSubcategory = 'Holiday Event';
    } else if (text.includes('festival') || subcategory.includes('festival')) {
      newSubcategory = 'Festival';
    } else {
      newSubcategory = 'Celebration';
    }
  }
  
  // CLASSES & WORKSHOPS (Educational only, not physical)
  else if (((text.includes('class') || text.includes('workshop')) &&
           !text.includes('gymnastic') && 
           !text.includes('ninja') &&
           !text.includes('movement')) ||
           (subcategory.includes('class') && !subcategory.includes('gymnastic'))) {
    newCategory = 'Classes & Workshops';
    
    if (text.includes('art') || text.includes('paint') || text.includes('craft') || subcategory.includes('art')) {
      newSubcategory = 'Art Class';
    } else if (text.includes('cook')) {
      newSubcategory = 'Cooking Class';
    } else if (text.includes('music')) {
      newSubcategory = 'Music Class';
    } else if (text.includes('stem') || text.includes('science') || text.includes('tech')) {
      newSubcategory = 'STEM Class';
    } else {
      newSubcategory = 'Class or Workshop';
    }
  }
  
  // ARTS & CULTURE
  else if (text.includes('museum') ||
           text.includes('theater') ||
           text.includes('theatre') ||
           text.includes('performance') ||
           text.includes('concert') ||
           text.includes('art exhibit') ||
           subcategory.includes('museum') ||
           subcategory.includes('theater') ||
           parentCategory.includes('arts, culture') ||
           text.includes('gallery')) {
    newCategory = 'Arts & Culture';
    
    if (text.includes('museum') || subcategory.includes('museum')) newSubcategory = 'Museum Event';
    else if (text.includes('theater') || text.includes('theatre') || subcategory.includes('theater')) newSubcategory = 'Theater Performance';
    else if (text.includes('concert')) newSubcategory = 'Concert';
    else newSubcategory = 'Arts & Culture';
  }
  
  // OUTDOOR & NATURE
  else if (text.includes('park program') ||
           text.includes('nature') ||
           text.includes('outdoor') ||
           text.includes('hike') ||
           text.includes('trail') ||
           text.includes('garden') ||
           subcategory.includes('outdoor') ||
           subcategory.includes('nature') ||
           subcategory.includes('garden') ||
           parentCategory.includes('outdoor') ||
           text.includes('botanical')) {
    newCategory = 'Outdoor & Nature';
    
    if (text.includes('hike') || text.includes('trail')) newSubcategory = 'Nature Hike';
    else if (text.includes('garden') || subcategory.includes('garden')) newSubcategory = 'Garden Event';
    else newSubcategory = 'Outdoor Activity';
  }
  
  // ANIMALS & WILDLIFE
  else if (text.includes('zoo') ||
           text.includes('aquarium') ||
           text.includes('animal') ||
           text.includes('wildlife') ||
           subcategory.includes('zoo') ||
           subcategory.includes('aquarium') ||
           text.includes('farm event')) {
    newCategory = 'Animals & Wildlife';
    
    if (text.includes('zoo') || subcategory.includes('zoo')) newSubcategory = 'Zoo Event';
    else if (text.includes('aquarium') || subcategory.includes('aquarium')) newSubcategory = 'Aquarium Event';
    else newSubcategory = 'Animal Event';
  }
  
  return {
    parentCategory: newCategory,
    displayCategory: newCategory,
    subcategory: newSubcategory
  };
}

module.exports = { categorizeEvent };