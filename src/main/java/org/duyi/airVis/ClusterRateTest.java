package org.duyi.airVis;

import com.mongodb.MongoClient;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoCursor;
import com.mongodb.client.MongoDatabase;
import com.vividsolutions.jts.geom.Coordinate;
import com.vividsolutions.jts.geom.GeometryFactory;
import com.vividsolutions.jts.geom.Point;
import org.apache.commons.io.FileUtils;
import org.bson.Document;
import org.geotools.geometry.jts.JTSFactoryFinder;
import org.geotools.referencing.GeodeticCalculator;
import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.text.SimpleDateFormat;
import java.util.*;

/**
 * Created by yidu on 4/29/16.
 */
public class ClusterRateTest {

    public  static void main(String[] args){

        MongoClient client = new MongoClient("127.0.0.1");
        MongoDatabase db = client.getDatabase("airdb");
        MongoCollection coll = db.getCollection("pm_stations");
        MongoCollection collCluster = db.getCollection("cluster");
        MongoCursor cur = coll.find().iterator();
        JSONObject oneStation;
        Calendar cal = Calendar.getInstance();
        SimpleDateFormat df = new SimpleDateFormat("EEE MMM dd yyyy HH:mm:ss", Locale.US);

        ArrayList<Double> centerLon = new ArrayList<Double>();
        ArrayList<Double> centerLat = new ArrayList<Double>();
        ArrayList<String> codes = new ArrayList<String>();
        ArrayList<String> citiesBelongs = new ArrayList<String>();//code属于的city
        MongoCursor curStation = coll.find().iterator();
        while(curStation.hasNext()){
            Document d = (Document)curStation.next();
            centerLon.add(d.getDouble("lon"));
            centerLat.add(d.getDouble("lat"));
            codes.add(d.getString("code"));
//            citiesBelongs.add(d.getString("city"));
            citiesBelongs.add(d.getString("province"));
        }
        int maxDistance = 100000;
        int step = 100000;
        HashSet<String> cities = new HashSet<String>();

        //中心 经度\纬度116°23′17〃，北纬：39°54′27;116.5, 40
        try {
            for(int i = 0; i < codes.size(); i ++) {
                if(cities.contains(citiesBelongs.get(i))) {
                    continue;
                }
                cities.add(citiesBelongs.get(i));
                FileUtils.write(new File("/Users/yidu/Downloads/orginal2.txt"), citiesBelongs.get(i) + "\t" + "", true);
                FileUtils.write(new File("/Users/yidu/Downloads/final2.txt"), citiesBelongs.get(i)+"\t"+"", true);
                FileUtils.write(new File("/Users/yidu/Downloads/rate2.txt"), citiesBelongs.get(i) + "\t" + "", true);
                System.out.println(citiesBelongs.get(i));
                for(int j = maxDistance; j < 3000000; j += step) {
                    Document d;
                    HashSet<String> clusterSet = new HashSet<String>();
                    int codesCount = 0;

                    cur = coll.find().iterator();
                    while (cur.hasNext()) {
                        d = (Document) cur.next();
                        double lon = d.getDouble("lon");
                        double lat = d.getDouble("lat");
                        GeodeticCalculator calc = new GeodeticCalculator();
                        // mind, this is lon/lat
                        calc.setStartingGeographicPoint(lon, lat);
                        calc.setDestinationGeographicPoint(centerLon.get(i), centerLat.get(i));//116.4, 40);
                        double distance = calc.getOrthodromicDistance();

                        //距离在最大距离之外的去除
                        if (distance > j)
                            continue;

                        codesCount ++;
                        //add clusterid
                        MongoCursor curCluster = collCluster.find(new Document("code", d.getString("code"))).iterator();

                        if (!curCluster.hasNext())//TODO
                            continue;
                        clusterSet.add(((Document) curCluster.next()).getString("clusterid"));

                    }
                    FileUtils.write(new File("/Users/yidu/Downloads/orginal2.txt"), codesCount+"\t"+"", true);
                    FileUtils.write(new File("/Users/yidu/Downloads/final2.txt"), clusterSet.size()+"\t"+"", true);
                    FileUtils.write(new File("/Users/yidu/Downloads/rate2.txt"), (1.0 * clusterSet.size()) / codesCount + "\t" + "", true);
                }
                FileUtils.write(new File("/Users/yidu/Downloads/orginal2.txt"), "\n", true);
                FileUtils.write(new File("/Users/yidu/Downloads/final2.txt"), "\n", true);
                FileUtils.write(new File("/Users/yidu/Downloads/rate2.txt"), "\n", true);
            }

            client.close();
        }catch(Exception e){
            e.printStackTrace();
        }

    }
}
