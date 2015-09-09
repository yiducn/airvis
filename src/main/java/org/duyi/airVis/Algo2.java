package org.duyi.airVis;

/**
 * Created by YiDu on 2015/3/25.
 */
public class Algo2 {
    public static void main(String[] args){
//        int[] v = {60, 60, 24, 7, 4, 3, 4};
//        int v1=1, v2=1, v3=1;
//        for(int i = 0; i < v.length-2; i++){
//            v1 = 1;
//            for(int l = 0; l <= i; l ++){
//                v1*=v[l];
//            }
//            for(int j = i + 1; j < v.length-1; j ++){
//                v2 = 1;
//                for(int m = i+1; m <= j; m ++){
//                    v2*=v[m];
//                }
//                for(int k = j + 1; k < v.length; k ++){
//                    v3 = 1;
//                    for(int n = j+1; n <= k; n ++){
//                        v3*=v[n];
//                    }
//                }
//                System.out.println(v1+","+v2+","+v3);
//            }
//        }
        int[] v = {60, 60, 24, 7, 4, 3, 4};
        int v1=1, v2=1, v3=1, v0=1;
        for(int h = 0; h < v.length-3; h++) {
            v0 = 1;
            for (int o = 0; o <= h; o++) {
                v0 *= v[o];
            }
            for (int i = h+1; i < v.length - 2; i++) {
                v1 = 1;
                for (int l = h+1; l <= i; l++) {
                    v1 *= v[l];
                }
                for (int j = i + 1; j < v.length - 1; j++) {
                    v2 = 1;
                    for (int m = i + 1; m <= j; m++) {
                        v2 *= v[m];
                    }
                    for (int k = j + 1; k < v.length; k++) {
                        v3 = 1;
                        for (int n = j + 1; n <= k; n++) {
                            v3 *= v[n];
                        }
                    }
                    System.out.println(v0+","+v1 + "," + v2 + "," + v3);
                }
            }
        }
    }
}
