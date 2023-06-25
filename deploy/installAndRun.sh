echo 'Start installing 6';

ROOT=$(pwd);
LOCKFILE="lockfile_server"

echo '_____________ INITIAL FOLDER STATE _____________'
ls -al
echo '_____________ INITIAL FOLDER STATE _____________'

if [ -f "$LOCKFILE" ]; then # will exit if all was installed
    echo "Starting..."
    npm run dev
    echo "Started"
    exit 1;
fi

echo "root path $ROOT";

ls -al

# Create custom config
echo 'Create custom server config'
echo "{
  \"connection\": {
    \"protocol\": \"${CN_PROTO}\",
    \"port\": ${CN_PORT},
    \"ssl\": {
      \"key\": \"${CN_SSL_KEY}\",
      \"cert\": \"${CN_SSL_CERT}\"
    }
  },
  \"db\": {
    \"names\": {
      \"mapper\": \"${PG_DB_MAIN}\",
      \"eveSde\": \"${PG_DB_EVE_STATIC_DATA}\",
      \"cachedESD\": \"${PG_DB_CACHE}\"
    },
    \"user\": \"${POSTGRES_USER}\",
    \"password\": \"${POSTGRES_PASSWORD}\",
    \"name\": \"${PG_DB_DUMMY}\",
    \"host\": \"${DATABASE_HOST}\"
  },
  \"eve\": {
    \"app\": {
      \"client_id\": \"${EVE_CLIENT_KEY}\",
      \"secret_key\": \"${EVE_SECRET_KEY}\"
    }
  }
}" > "$ROOT/js/conf/custom.json";

cat "$ROOT/js/conf/custom.json"
echo 'Created'

echo " _____________ CREATE DUMMY DB ----------------"
PGPASSWORD=$POSTGRES_PASSWORD psql -h $DATABASE_HOST -U $POSTGRES_USER -d $POSTGRES_DB -c "create database ${PG_DB_DUMMY}";
PGPASSWORD=$POSTGRES_PASSWORD psql -h $DATABASE_HOST -U $POSTGRES_USER -d $POSTGRES_DB -c "grant all privileges on database ${PG_DB_DUMMY} to ${POSTGRES_USER}";
echo " _____________ CREATE DUMMY DB ----------------"

echo "Download latest Eve static data database";
if [ "$(find eveData | grep dump)" == "" ]; then
  mkdir -p "$ROOT/eveData/dump";
fi

cd "$ROOT/eveData/dump" || exit;
rm -rf .

latestURL='https://www.fuzzwork.co.uk/dump/latest/';
RX='postgres.*TRANQUILITY.dmp';
RXBZ="${RX}.bz2";
latestSDE=$(curl "${latestURL}" | grep -o "\"${RXBZ}\"" | grep -o "${RX}");
echo "Latest SDE '${latestSDE}'";

isCurrentLatest=$(find . | grep -o "$latestSDE");
echo " _____________ latestSDE path ----------------"
echo "$isCurrentLatest"
echo "$latestSDE"
echo " _____________ latestSDE ----------------"


if [ "$isCurrentLatest" == "" ]; then
  echo "Start download \"${latestSDE}.bz2\""
  # shellcheck disable=SC2115
  rm -rf "${ROOT}/*";
  curl -O "${latestURL}${latestSDE}.bz2";
  bzip2 -d "${latestSDE}.bz2";
fi

echo " _____________ DUMP ----------------"
ls -al
echo " _____________ DUMP ----------------"

cd "$ROOT" || exit;

echo "Install server part";
npm install;
npm run installApp
echo "Finished installing DB part";


echo "" > "${ROOT}/${LOCKFILE}"

echo "Starting..."
npm run dev
echo "Started"

