console.log('Imporetd Insdgfaksdjfasdkjfasdkjfnasdkjfasdkfnj');

class IndexDBHelper { 
   /**
   * Open database
   */
  static openDatabase() {
    console.log('XXXXXXXXXXXXXXXX','Database helper is working!',IndexDBHelper.DB_NAME);
  }
}

IndexDBHelper.DB_NAME = 'stage2db';
IndexDBHelper.RESTAURANTS = 'restaurants';
IndexDBHelper.CUISINE_INDEX = 'cuisine';
IndexDBHelper.NEIGHBORHOOD_INDEX = 'neighborhood';